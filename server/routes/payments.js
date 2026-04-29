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
    const { sessionId, therapistId, amount, duration, isRecurring, recurringGroupId } = req.body;

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
      // For recurring: store group id so confirmation can mark all sessions paid
      recurringGroupId: isRecurring ? recurringGroupId : undefined,
      sessionsCovered: isRecurring ? 4 : 1,
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

// POST /api/payments/group-checkout - create PhonePe payment for a group enrollment
router.post('/group-checkout', protect, clientOnly, async (req, res) => {
  try {
    const { enrollmentId } = req.body;
    if (!enrollmentId) return res.status(400).json({ message: 'enrollmentId required' });

    const GroupEnrollment = (await import('../models/GroupEnrollment.js')).default;
    const GroupTherapy = (await import('../models/GroupTherapy.js')).default;
    const enrollment = await GroupEnrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    if (String(enrollment.clientId) !== String(req.userId)) return res.status(403).json({ message: 'Not your enrollment' });
    if (enrollment.status !== 'approved') return res.status(400).json({ message: 'Enrollment must be approved before payment' });
    if (enrollment.paymentStatus === 'paid') return res.status(400).json({ message: 'Already paid' });

    const group = await GroupTherapy.findById(enrollment.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const amount = group.pricePerMember * (group.totalSessions || 1);
    const therapistId = group.leadTherapists?.[0];

    const merchantTransactionId = 'EHSAAS_GRP_' + uuidv4().replace(/-/g, '').substring(0, 18);

    const payment = await Payment.create({
      clientId: req.userId,
      therapistId,
      groupEnrollmentId: enrollment._id,
      amount,
      status: 'pending',
      paymentMethod: 'phonepe',
      stripePaymentIntentId: merchantTransactionId,
      sessionsCovered: group.totalSessions || 1,
    });

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: 'MUID_' + req.userId.toString().substring(0, 20),
      amount: amount * 100,
      redirectUrl: `${process.env.CLIENT_URL}/payment-success?transactionId=${merchantTransactionId}&paymentId=${payment._id}&type=group`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.CLIENT_URL}/api/payments/callback`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const endpoint = '/pg/v1/pay';
    const { base64Payload, checksum } = generateChecksum(payload, endpoint);

    const response = await axios.post(
      `${PHONEPE_HOST}${endpoint}`,
      { request: base64Payload },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum } }
    );

    if (response.data.success && response.data.data?.instrumentResponse?.redirectInfo?.url) {
      payment.stripeSessionId = merchantTransactionId;
      await payment.save();
      res.json({ url: response.data.data.instrumentResponse.redirectInfo.url, merchantTransactionId, paymentId: payment._id });
    } else {
      console.error('PhonePe group response:', JSON.stringify(response.data));
      res.status(400).json({ message: 'Payment initiation failed', details: response.data.message || 'Unknown' });
    }
  } catch (error) {
    console.error('Group checkout error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Payment error', error: error.response?.data?.message || error.message });
  }
});

// POST /api/payments/workshop-checkout
router.post('/workshop-checkout', protect, clientOnly, async (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) return res.status(400).json({ message: 'registrationId required' });

    const WorkshopRegistration = (await import('../models/WorkshopRegistration.js')).default;
    const Workshop = (await import('../models/Workshop.js')).default;
    const reg = await WorkshopRegistration.findById(registrationId);
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    if (String(reg.clientId) !== String(req.userId)) return res.status(403).json({ message: 'Not your registration' });
    if (reg.paymentStatus === 'paid') return res.status(400).json({ message: 'Already paid' });

    const w = await Workshop.findById(reg.workshopId);
    if (!w) return res.status(404).json({ message: 'Workshop not found' });

    const amount = w.pricePerParticipant;
    const therapistId = w.facilitatorTherapistIds?.[0];

    const merchantTransactionId = 'EHSAAS_WS_' + uuidv4().replace(/-/g, '').substring(0, 18);

    const payment = await Payment.create({
      clientId: req.userId,
      therapistId,
      workshopRegistrationId: reg._id,
      amount,
      status: 'pending',
      paymentMethod: 'phonepe',
      stripePaymentIntentId: merchantTransactionId,
    });

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: 'MUID_' + req.userId.toString().substring(0, 20),
      amount: amount * 100,
      redirectUrl: `${process.env.CLIENT_URL}/payment-success?transactionId=${merchantTransactionId}&paymentId=${payment._id}&type=workshop`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.CLIENT_URL}/api/payments/callback`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };
    const endpoint = '/pg/v1/pay';
    const { base64Payload, checksum } = generateChecksum(payload, endpoint);
    const response = await axios.post(`${PHONEPE_HOST}${endpoint}`, { request: base64Payload },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum } });

    if (response.data.success && response.data.data?.instrumentResponse?.redirectInfo?.url) {
      payment.stripeSessionId = merchantTransactionId;
      await payment.save();
      res.json({ url: response.data.data.instrumentResponse.redirectInfo.url, merchantTransactionId, paymentId: payment._id });
    } else {
      res.status(400).json({ message: 'Payment initiation failed', details: response.data.message || 'Unknown' });
    }
  } catch (error) {
    console.error('Workshop checkout error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Payment error', error: error.response?.data?.message || error.message });
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

      // For recurring: mark ALL sessions in group as paid
      if (payment.recurringGroupId) {
        try {
          const Session = (await import('../models/Session.js')).default;
          await Session.updateMany(
            { recurringGroupId: payment.recurringGroupId },
            { $set: { paymentStatus: 'paid' } }
          );
        } catch (e) { console.error('[RECURRING-PAID]', e.message); }
      } else if (payment.sessionId) {
        try {
          const Session = (await import('../models/Session.js')).default;
          await Session.findByIdAndUpdate(payment.sessionId, { paymentStatus: 'paid' });
        } catch (e) { console.error('[SESSION-PAID]', e.message); }
      } else if (payment.workshopRegistrationId) {
        try {
          const WorkshopRegistration = (await import('../models/WorkshopRegistration.js')).default;
          const Notification = (await import('../models/Notification.js')).default;
          const reg = await WorkshopRegistration.findByIdAndUpdate(payment.workshopRegistrationId, {
            paymentStatus: 'paid',
            paidAmount: payment.amount,
            paymentId: payment._id,
          }, { new: true }).populate('workshopId', 'title sessionDates');
          if (reg) {
            Notification.notify(reg.clientId, 'client', 'workshop_paid',
              `Payment confirmed — ${reg.workshopId?.title}`,
              `Your spot is confirmed. Joining link will be shared closer to the first session.`,
              `/workshops/${reg.workshopId?._id}`
            ).catch(() => {});
          }
        } catch (e) { console.error('[WORKSHOP-PAID]', e.message); }
      } else if (payment.groupEnrollmentId) {
        // Group enrollment payment: mark enrollment as paid + status='enrolled'
        try {
          const GroupEnrollment = (await import('../models/GroupEnrollment.js')).default;
          const Notification = (await import('../models/Notification.js')).default;
          const enroll = await GroupEnrollment.findByIdAndUpdate(payment.groupEnrollmentId, {
            paymentStatus: 'paid',
            paidAmount: payment.amount,
            paymentId: payment._id,
            status: 'enrolled',
          }, { new: true });
          if (enroll) {
            Notification.notify(enroll.clientId, 'client', 'group_enrollment',
              'Payment confirmed — you\'re enrolled!',
              `Your spot in the group is now confirmed. Look out for chat group access closer to the start.`,
              `/group-therapy/${enroll.groupId}`
            ).catch(() => {});
          }
        } catch (e) { console.error('[GROUP-ENROLLMENT-PAID]', e.message); }
      }

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
