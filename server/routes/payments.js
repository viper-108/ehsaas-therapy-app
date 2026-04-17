import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import Therapist from '../models/Therapist.js';
import { protect, clientOnly } from '../middleware/auth.js';

const router = express.Router();

const PHONEPE_HOST = process.env.PHONEPE_HOST || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
const SALT_KEY = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

// Generate PhonePe checksum
const generateChecksum = (payload, endpoint) => {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const string = base64Payload + endpoint + SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return { base64Payload, checksum: sha256 + '###' + SALT_INDEX };
};

// POST /api/payments/create-checkout - create PhonePe payment
router.post('/create-checkout', protect, clientOnly, async (req, res) => {
  try {
    const { sessionId, therapistId, amount, duration } = req.body;

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    // Create unique merchant transaction ID
    const merchantTransactionId = 'EHSAAS_' + uuidv4().replace(/-/g, '').substring(0, 20);

    // Create payment record in our DB
    const payment = await Payment.create({
      clientId: req.userId,
      therapistId,
      sessionId,
      amount,
      status: 'pending',
      paymentMethod: 'phonepe',
      stripePaymentIntentId: merchantTransactionId, // reusing field for PhonePe txn ID
    });

    // PhonePe payload
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: 'MUID_' + req.userId.toString().substring(0, 20),
      amount: amount * 100, // PhonePe expects amount in paise
      redirectUrl: `${process.env.CLIENT_URL}/payment-success?transactionId=${merchantTransactionId}&paymentId=${payment._id}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.CLIENT_URL}/api/payments/callback`,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const endpoint = '/pg/v1/pay';
    const { base64Payload, checksum } = generateChecksum(payload, endpoint);

    // Call PhonePe API
    const response = await axios.post(
      `${PHONEPE_HOST}${endpoint}`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
        },
      }
    );

    if (response.data.success && response.data.data?.instrumentResponse?.redirectInfo?.url) {
      const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;

      // Save the PhonePe session ID
      payment.stripeSessionId = merchantTransactionId; // reusing field
      await payment.save();

      res.json({
        url: redirectUrl,
        merchantTransactionId,
        paymentId: payment._id,
      });
    } else {
      console.error('PhonePe response:', JSON.stringify(response.data));
      res.status(400).json({
        message: 'Payment initiation failed',
        details: response.data.message || 'Unknown error from PhonePe',
      });
    }
  } catch (error) {
    console.error('Create checkout error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Payment error',
      error: error.response?.data?.message || error.message,
    });
  }
});

// POST /api/payments/confirm - verify payment status with PhonePe
router.post('/confirm', protect, async (req, res) => {
  try {
    const { paymentId, transactionId } = req.body;

    if (!paymentId || !transactionId) {
      return res.status(400).json({ message: 'paymentId and transactionId are required' });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.json({ status: 'already_completed' });
    }

    // Check payment status with PhonePe
    const endpoint = `/pg/v1/status/${MERCHANT_ID}/${transactionId}`;
    const string = endpoint + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + SALT_INDEX;

    const response = await axios.get(`${PHONEPE_HOST}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': MERCHANT_ID,
      },
    });

    const paymentStatus = response.data;

    if (paymentStatus.success && paymentStatus.code === 'PAYMENT_SUCCESS') {
      payment.status = 'completed';
      await payment.save();

      // Update therapist earnings
      await Therapist.findByIdAndUpdate(payment.therapistId, {
        $inc: { totalEarnings: payment.amount },
      });

      res.json({ status: 'completed', data: paymentStatus.data });
    } else if (paymentStatus.code === 'PAYMENT_PENDING') {
      res.json({ status: 'pending' });
    } else {
      payment.status = 'failed';
      await payment.save();
      res.json({ status: 'failed', code: paymentStatus.code });
    }
  } catch (error) {
    console.error('Confirm payment error:', error.response?.data || error.message);
    // If PhonePe status check fails, don't crash — return pending
    res.json({ status: 'pending', error: error.message });
  }
});

// POST /api/payments/callback - PhonePe server-to-server callback
router.post('/callback', async (req, res) => {
  try {
    const { response: encodedResponse } = req.body;

    if (!encodedResponse) {
      return res.status(400).json({ message: 'No response data' });
    }

    // Decode and verify
    const decoded = JSON.parse(Buffer.from(encodedResponse, 'base64').toString());
    console.log('PhonePe callback:', JSON.stringify(decoded));

    if (decoded.success && decoded.code === 'PAYMENT_SUCCESS') {
      const merchantTransactionId = decoded.data?.merchantTransactionId;

      if (merchantTransactionId) {
        const payment = await Payment.findOne({
          stripePaymentIntentId: merchantTransactionId,
        });

        if (payment && payment.status !== 'completed') {
          payment.status = 'completed';
          await payment.save();

          await Therapist.findByIdAndUpdate(payment.therapistId, {
            $inc: { totalEarnings: payment.amount },
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(400).json({ message: 'Callback error' });
  }
});

// GET /api/payments/my - get payment history
router.get('/my', protect, async (req, res) => {
  try {
    let query = {};
    if (req.userRole === 'client') {
      query.clientId = req.userId;
    } else if (req.userRole === 'therapist') {
      query.therapistId = req.userId;
    }

    const payments = await Payment.find(query)
      .populate('therapistId', 'name title')
      .populate('clientId', 'name email')
      .populate('sessionId')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
