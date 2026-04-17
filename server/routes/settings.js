import express from 'express';
import Settings from '../models/Settings.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings — get all settings as { key: value } map (public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const settings = await Settings.find(query);
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/settings/full — get all settings with metadata (admin)
router.get('/full', protect, adminOnly, async (req, res) => {
  try {
    const settings = await Settings.find().sort({ category: 1, key: 1 });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/settings/:key — update a single setting (admin)
router.put('/:key', protect, adminOnly, async (req, res) => {
  try {
    const { value } = req.body;
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true }
    );
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/settings — create a new setting (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { key, value, category, description } = req.body;
    const setting = await Settings.create({ key, value, category, description });
    res.status(201).json(setting);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Setting key already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
