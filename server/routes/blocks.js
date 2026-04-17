import express from 'express';
import Block from '../models/Block.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/blocks - block a user
router.post('/', protect, async (req, res) => {
  try {
    const { blockedId, reason } = req.body;
    if (!blockedId) return res.status(400).json({ message: 'blockedId is required' });

    const blockedRole = req.userRole === 'client' ? 'therapist' : 'client';

    // Check if already blocked
    const existing = await Block.findOne({ blockerId: req.userId, blockedId });
    if (existing) return res.status(400).json({ message: 'User already blocked' });

    const block = await Block.create({
      blockerId: req.userId,
      blockerRole: req.userRole,
      blockedId,
      blockedRole,
      reason: reason || '',
    });

    res.status(201).json(block);
  } catch (error) {
    console.error('Block error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/blocks/:blockedId - unblock a user
router.delete('/:blockedId', protect, async (req, res) => {
  try {
    const result = await Block.findOneAndDelete({
      blockerId: req.userId,
      blockedId: req.params.blockedId,
    });
    if (!result) return res.status(404).json({ message: 'Block not found' });
    res.json({ message: 'Unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/blocks - list all users I've blocked
router.get('/', protect, async (req, res) => {
  try {
    const Therapist = (await import('../models/Therapist.js')).default;
    const Client = (await import('../models/Client.js')).default;

    const blocks = await Block.find({ blockerId: req.userId }).sort({ createdAt: -1 });

    const result = [];
    for (const b of blocks) {
      let user;
      if (b.blockedRole === 'therapist') {
        user = await Therapist.findById(b.blockedId).select('name title image');
      } else {
        user = await Client.findById(b.blockedId).select('name email');
      }
      result.push({
        _id: b._id,
        blockedId: b.blockedId,
        blockedRole: b.blockedRole,
        blockedUser: user ? { _id: user._id, name: user.name, title: user.title, image: user.image } : null,
        reason: b.reason,
        createdAt: b.createdAt,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/blocks/check/:userId - check if a specific user is blocked (by me or blocking me)
router.get('/check/:userId', protect, async (req, res) => {
  try {
    const iBlockedThem = await Block.findOne({ blockerId: req.userId, blockedId: req.params.userId });
    const theyBlockedMe = await Block.findOne({ blockerId: req.params.userId, blockedId: req.userId });
    res.json({
      iBlockedThem: !!iBlockedThem,
      theyBlockedMe: !!theyBlockedMe,
      isBlocked: !!iBlockedThem || !!theyBlockedMe,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
