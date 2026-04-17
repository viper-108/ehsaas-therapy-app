import express from 'express';
import Review from '../models/Review.js';
import Session from '../models/Session.js';
import Therapist from '../models/Therapist.js';
import { protect, clientOnly } from '../middleware/auth.js';

const router = express.Router();

// POST /api/reviews — create a review for a completed session
router.post('/', protect, clientOnly, async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body;

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
      rating,
      comment: comment || '',
    });

    // Update session with review reference
    session.reviewId = review._id;
    await session.save();

    // Recalculate therapist average rating
    const agg = await Review.aggregate([
      { $match: { therapistId: session.therapistId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    if (agg.length > 0) {
      await Therapist.findByIdAndUpdate(session.therapistId, {
        rating: Math.round(agg[0].avgRating * 10) / 10
      });
    }

    const populated = await review.populate('clientId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/therapist/:therapistId — public reviews for a therapist
router.get('/therapist/:therapistId', async (req, res) => {
  try {
    const reviews = await Review.find({ therapistId: req.params.therapistId })
      .populate('clientId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/my — client's own reviews
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

export default router;
