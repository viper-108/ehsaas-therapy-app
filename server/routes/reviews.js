import express from 'express';
import Review from '../models/Review.js';
import Session from '../models/Session.js';
import Therapist from '../models/Therapist.js';
import { protect, clientOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Recalculate therapist's average rating from APPROVED reviews only
const recalcTherapistRating = async (therapistId) => {
  if (!therapistId) return;
  const agg = await Review.aggregate([
    { $match: { therapistId: new (await import('mongoose')).default.Types.ObjectId(String(therapistId)), reviewType: 'therapist', approvalStatus: 'approved' } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const avg = agg.length > 0 ? Math.round(agg[0].avgRating * 10) / 10 : 0;
  const count = agg.length > 0 ? agg[0].count : 0;
  await Therapist.findByIdAndUpdate(therapistId, { rating: avg, totalReviews: count });
};

// POST /api/reviews — create a therapist review for a completed session (goes pending)
router.post('/', protect, clientOnly, async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body;
    if (!sessionId || !rating) return res.status(400).json({ message: 'Session and rating required' });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.clientId.toString() !== req.userId) return res.status(403).json({ message: 'Not your session' });
    if (session.status !== 'completed') return res.status(400).json({ message: 'Can only review completed sessions' });

    const existing = await Review.findOne({ sessionId });
    if (existing) return res.status(400).json({ message: 'Already reviewed this session' });

    const review = await Review.create({
      clientId: req.userId,
      therapistId: session.therapistId,
      sessionId,
      reviewType: 'therapist',
      rating,
      comment: comment || '',
      approvalStatus: 'pending',
    });

    // Update session with review reference
    session.reviewId = review._id;
    await session.save();

    // Notify admin (in-app)
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const admins = await Admin.find({}).select('_id');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'review_pending',
          'New review awaiting approval',
          `A client submitted a ${rating}-star review for a therapist.`,
          '/admin-dashboard?tab=reviews'
        ).catch(() => {});
      }
    } catch {}

    const populated = await review.populate('clientId', 'name');
    res.status(201).json({ ...populated.toObject(), message: 'Review submitted. It will be visible after admin approval.' });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reviews/ehsaas — submit a review for the ehsaas platform itself
router.post('/ehsaas', protect, clientOnly, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating) return res.status(400).json({ message: 'Rating required' });
    const review = await Review.create({
      clientId: req.userId,
      reviewType: 'ehsaas',
      rating,
      comment: comment || '',
      approvalStatus: 'pending',
    });
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const admins = await Admin.find({}).select('_id');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'review_pending',
          'New Ehsaas review awaiting approval',
          `A client submitted a ${rating}-star review for Ehsaas.`,
          '/admin-dashboard?tab=reviews'
        ).catch(() => {});
      }
    } catch {}
    res.status(201).json({ ...review.toObject(), message: 'Review submitted. It will be visible after admin approval.' });
  } catch (error) {
    console.error('Create ehsaas review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/therapist/:therapistId — public approved reviews for a therapist
router.get('/therapist/:therapistId', async (req, res) => {
  try {
    const reviews = await Review.find({ therapistId: req.params.therapistId, approvalStatus: 'approved' })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/ehsaas — public approved reviews for ehsaas
router.get('/ehsaas', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewType: 'ehsaas', approvalStatus: 'approved' })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/my — client's own reviews (any status)
router.get('/my', protect, clientOnly, async (req, res) => {
  try {
    const reviews = await Review.find({ clientId: req.userId })
      .populate('therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ADMIN MODERATION ====================

// GET /api/reviews/admin/pending — list all pending reviews
router.get('/admin/pending', protect, adminOnly, async (req, res) => {
  try {
    const reviews = await Review.find({ approvalStatus: 'pending' })
      .populate('clientId', 'name email')
      .populate('therapistId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/admin/all — list all reviews (any status)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('clientId', 'name email')
      .populate('therapistId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/reviews/admin/:id/approve — approve a review
router.put('/admin/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, {
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: req.userId,
      rejectionReason: '',
    }, { new: true });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.therapistId) await recalcTherapistRating(review.therapistId);
    res.json(review);
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/reviews/admin/:id/reject — reject a review
router.put('/admin/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, {
      approvalStatus: 'rejected',
      rejectionReason: reason || '',
    }, { new: true });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.therapistId) await recalcTherapistRating(review.therapistId);
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
