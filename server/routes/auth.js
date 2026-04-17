import express from 'express';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Admin from '../models/Admin.js';
import { generateToken, protect } from '../middleware/auth.js';

const router = express.Router();

// ==================== THERAPIST AUTH ====================

// POST /api/auth/therapist/register
router.post('/therapist/register', async (req, res) => {
  try {
    const { email, password, name, phone, title, specializations, experience, bio, languages, pricing } = req.body;

    const exists = await Therapist.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered as therapist' });
    }

    const therapist = await Therapist.create({
      email,
      password,
      name,
      phone,
      title: title || 'Psychologist',
      specializations: specializations || [],
      experience: experience || 0,
      bio: bio || '',
      languages: languages || ['English'],
      pricing: pricing || { '30': 600, '50': 900 },
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: true },
      ],
    });

    const token = generateToken(therapist._id, 'therapist');
    res.status(201).json({
      token,
      user: therapist.toPublicJSON(),
      role: 'therapist'
    });
  } catch (error) {
    console.error('Therapist register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/therapist/login
router.post('/therapist/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const therapist = await Therapist.findOne({ email });

    if (!therapist || !(await therapist.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(therapist._id, 'therapist');
    res.json({
      token,
      user: therapist.toPublicJSON(),
      role: 'therapist'
    });
  } catch (error) {
    console.error('Therapist login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== CLIENT AUTH ====================

// POST /api/auth/client/register
router.post('/client/register', async (req, res) => {
  try {
    const { email, password, name, phone, therapyPreferences, referralCode } = req.body;

    const exists = await Client.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const client = await Client.create({
      email,
      password,
      name,
      phone,
      therapyPreferences: therapyPreferences || {},
    });

    // Handle referral if code provided
    if (referralCode) {
      try {
        const Referral = (await import('../models/Referral.js')).default;
        const referrer = await Client.findOne({ referralCode });
        if (referrer) {
          await Referral.create({
            referrerId: referrer._id,
            referralCode,
            referredEmail: email,
            referredClientId: client._id,
            status: 'completed',
          });
        }
      } catch (refErr) {
        console.error('Referral tracking error:', refErr.message);
      }
    }

    const token = generateToken(client._id, 'client');
    res.status(201).json({
      token,
      user: client.toPublicJSON(),
      role: 'client'
    });
  } catch (error) {
    console.error('Client register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/client/login
router.post('/client/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await Client.findOne({ email });

    if (!client || !(await client.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(client._id, 'client');
    res.json({
      token,
      user: client.toPublicJSON(),
      role: 'client'
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ADMIN AUTH ====================

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(admin._id, 'admin');
    res.json({
      token,
      user: admin.toPublicJSON(),
      role: 'admin'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me  - get current user profile
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user, role: req.userRole });
});

// GET /api/auth/referrals/my — client's referrals
router.get('/referrals/my', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Client only' });
    const Referral = (await import('../models/Referral.js')).default;
    const client = await Client.findById(req.userId).select('referralCode');
    const referrals = await Referral.find({ referrerId: req.userId })
      .populate('referredClientId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ referralCode: client?.referralCode || '', referrals });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
