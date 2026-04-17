import express from 'express';
import Resource from '../models/Resource.js';
import { protect, therapistOnly, clientOnly } from '../middleware/auth.js';

const router = express.Router();

// POST /api/resources — therapist creates resource
router.post('/', protect, therapistOnly, async (req, res) => {
  try {
    const resource = await Resource.create({ ...req.body, therapistId: req.userId });
    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/my — therapist's resources
router.get('/my', protect, therapistOnly, async (req, res) => {
  try {
    const resources = await Resource.find({ therapistId: req.userId }).sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/shared — client sees resources shared with them
router.get('/shared', protect, clientOnly, async (req, res) => {
  try {
    const resources = await Resource.find({
      $or: [{ sharedWith: req.userId }, { isPublic: true }]
    }).populate('therapistId', 'name title').sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/resources/public — public resources
router.get('/public', async (req, res) => {
  try {
    const resources = await Resource.find({ isPublic: true })
      .populate('therapistId', 'name title').sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/resources/:id — update resource
router.put('/:id', protect, therapistOnly, async (req, res) => {
  try {
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      req.body, { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Not found' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/resources/:id/share — share with clients
router.put('/:id/share', protect, therapistOnly, async (req, res) => {
  try {
    const { clientIds } = req.body;
    const resource = await Resource.findOneAndUpdate(
      { _id: req.params.id, therapistId: req.userId },
      { $addToSet: { sharedWith: { $each: clientIds } } },
      { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Not found' });
    res.json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', protect, therapistOnly, async (req, res) => {
  try {
    await Resource.findOneAndDelete({ _id: req.params.id, therapistId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
