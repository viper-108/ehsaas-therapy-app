import express from 'express';
import Waitlist from '../models/Waitlist.js';
import Therapist from '../models/Therapist.js';
import { protect, clientOnly, therapistOnly } from '../middleware/auth.js';

const router = express.Router();

// POST /api/waitlist — join waitlist
router.post('/', protect, clientOnly, async (req, res) => {
  try {
    const { therapistId, date } = req.body;

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    // Check if already on waitlist
    const existing = await Waitlist.findOne({
      clientId: req.userId,
      therapistId,
      date: new Date(date),
      status: 'waiting'
    });
    if (existing) return res.status(400).json({ message: 'Already on waitlist for this date' });

    const entry = await Waitlist.create({
      clientId: req.userId,
      therapistId,
      date: new Date(date),
    });

    const populated = await entry.populate('therapistId', 'name title');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/waitlist/my — client's active waitlist entries
router.get('/my', protect, clientOnly, async (req, res) => {
  try {
    const entries = await Waitlist.find({ clientId: req.userId, status: 'waiting' })
      .populate('therapistId', 'name title image')
      .sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/waitlist/therapist — therapist's waitlist
router.get('/therapist', protect, therapistOnly, async (req, res) => {
  try {
    const entries = await Waitlist.find({ therapistId: req.userId, status: 'waiting' })
      .populate('clientId', 'name email')
      .sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/waitlist/:id — leave waitlist
router.delete('/:id', protect, clientOnly, async (req, res) => {
  try {
    const entry = await Waitlist.findOneAndDelete({ _id: req.params.id, clientId: req.userId });
    if (!entry) return res.status(404).json({ message: 'Waitlist entry not found' });
    res.json({ message: 'Removed from waitlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
