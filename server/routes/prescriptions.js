import express from 'express';
import Prescription from '../models/Prescription.js';
import Therapist from '../models/Therapist.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Middleware: only psychiatrists
const psychiatristOnly = async (req, res, next) => {
  if (req.userRole !== 'therapist') return res.status(403).json({ message: 'Therapist only' });
  const t = await Therapist.findById(req.userId).select('therapistType');
  if (!t || t.therapistType !== 'psychiatrist') {
    return res.status(403).json({ message: 'Only psychiatrists can manage prescriptions' });
  }
  next();
};

// POST /api/prescriptions — psychiatrist creates
router.post('/', protect, psychiatristOnly, async (req, res) => {
  try {
    const prescription = await Prescription.create({
      ...req.body,
      psychiatristId: req.userId,
    });
    const populated = await prescription.populate([
      { path: 'clientId', select: 'name email' },
      { path: 'psychiatristId', select: 'name title' },
    ]);
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/prescriptions/my — psychiatrist sees all prescriptions they wrote
router.get('/my', protect, psychiatristOnly, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ psychiatristId: req.userId })
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/prescriptions/client — client sees their own prescriptions
router.get('/client', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Client only' });
    const prescriptions = await Prescription.find({ clientId: req.userId })
      .populate('psychiatristId', 'name title')
      .sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/prescriptions/:id — psychiatrist updates
router.put('/:id', protect, psychiatristOnly, async (req, res) => {
  try {
    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, psychiatristId: req.userId },
      req.body,
      { new: true }
    );
    if (!prescription) return res.status(404).json({ message: 'Not found' });
    res.json(prescription);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/prescriptions/:id
router.delete('/:id', protect, psychiatristOnly, async (req, res) => {
  try {
    const result = await Prescription.findOneAndDelete({ _id: req.params.id, psychiatristId: req.userId });
    if (!result) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
