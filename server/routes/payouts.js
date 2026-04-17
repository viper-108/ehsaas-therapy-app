import express from 'express';
import Payout from '../models/Payout.js';
import Payment from '../models/Payment.js';
import Therapist from '../models/Therapist.js';
import { protect, therapistOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/payouts/my — therapist monthly earnings breakdown
router.get('/my', protect, therapistOnly, async (req, res) => {
  try {
    // Get completed payments grouped by month
    const payments = await Payment.find({ therapistId: req.userId, status: 'completed' });

    const monthlyEarnings = {};
    payments.forEach(p => {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyEarnings[key]) monthlyEarnings[key] = { period: key, total: 0, count: 0 };
      monthlyEarnings[key].total += p.amount;
      monthlyEarnings[key].count += 1;
    });

    // Get payout records
    const payouts = await Payout.find({ therapistId: req.userId }).sort({ createdAt: -1 });

    // Get bank details
    const therapist = await Therapist.findById(req.userId).select('bankDetails totalEarnings');

    res.json({
      monthlyEarnings: Object.values(monthlyEarnings).sort((a, b) => b.period.localeCompare(a.period)),
      payouts,
      bankDetails: therapist?.bankDetails || {},
      totalEarnings: therapist?.totalEarnings || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/payouts/bank-details — save bank details
router.put('/bank-details', protect, therapistOnly, async (req, res) => {
  try {
    const { accountNumber, ifscCode, bankName, accountHolder } = req.body;
    const therapist = await Therapist.findByIdAndUpdate(
      req.userId,
      { bankDetails: { accountNumber, ifscCode, bankName, accountHolder } },
      { new: true }
    ).select('bankDetails');
    res.json(therapist.bankDetails);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payouts/admin — admin sees all payouts
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const payouts = await Payout.find()
      .populate('therapistId', 'name email bankDetails')
      .sort({ createdAt: -1 });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/payouts/admin/process/:id — admin processes payout
router.post('/admin/process/:id', protect, adminOnly, async (req, res) => {
  try {
    const { transactionRef, notes } = req.body;
    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', transactionRef: transactionRef || '', notes: notes || '' },
      { new: true }
    );
    if (!payout) return res.status(404).json({ message: 'Payout not found' });
    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
