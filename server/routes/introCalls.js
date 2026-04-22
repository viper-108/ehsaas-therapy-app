import express from 'express';
import IntroCallRequest from '../models/IntroCallRequest.js';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import { protect, clientOnly, therapistOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// POST /api/intro-calls — client requests intro call
router.post('/', protect, clientOnly, async (req, res) => {
  try {
    const { therapistId, clientName, phone, email, reasonForTherapy, whatLookingFor, preferredDateTime } = req.body;

    if (!therapistId || !clientName || !phone || !email || !reasonForTherapy || !whatLookingFor || !preferredDateTime) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    if (therapist.accountStatus === 'past') {
      return res.status(400).json({ message: 'This therapist is no longer available.' });
    }

    // Check if already has a pending request with this therapist
    const existing = await IntroCallRequest.findOne({ clientId: req.userId, therapistId, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'You already have a pending intro call request with this therapist' });

    const request = await IntroCallRequest.create({
      clientId: req.userId,
      therapistId,
      clientName,
      phone,
      email,
      reasonForTherapy,
      whatLookingFor,
      preferredDateTime: new Date(preferredDateTime),
    });

    // Notify therapist via email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">New Intro Call Request</h2>
        <p><strong>${clientName}</strong> has requested an introductory call with you.</p>
        <table style="width:100%; border-collapse:collapse; margin:15px 0;">
          <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Name</td><td style="padding:8px; border:1px solid #ddd;">${clientName}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Phone</td><td style="padding:8px; border:1px solid #ddd;">${phone}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Email</td><td style="padding:8px; border:1px solid #ddd;">${email}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Reason for Therapy</td><td style="padding:8px; border:1px solid #ddd;">${reasonForTherapy}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">What They're Looking For</td><td style="padding:8px; border:1px solid #ddd;">${whatLookingFor}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Preferred Date/Time</td><td style="padding:8px; border:1px solid #ddd;">${new Date(preferredDateTime).toLocaleString('en-IN')}</td></tr>
        </table>
        <p>Please log in to your dashboard to accept or decline this request.</p>
      </div>`;
    sendEmail(therapist.email, `New Intro Call Request from ${clientName}`, html).catch(e => console.error('Intro call email error:', e));

    res.status(201).json(request);
  } catch (error) {
    console.error('Intro call create error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/intro-calls/my — client's requests
router.get('/my', protect, clientOnly, async (req, res) => {
  try {
    const requests = await IntroCallRequest.find({ clientId: req.userId })
      .populate('therapistId', 'name title image')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/intro-calls/therapist — therapist's received requests
router.get('/therapist', protect, therapistOnly, async (req, res) => {
  try {
    const requests = await IntroCallRequest.find({ therapistId: req.userId })
      .populate('clientId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/intro-calls/:id/status — therapist approves/rejects
router.put('/:id/status', protect, therapistOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await IntroCallRequest.findOne({ _id: req.params.id, therapistId: req.userId });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    await request.save();

    // Notify client
    const therapist = await Therapist.findById(req.userId);
    if (status === 'approved') {
      const html = `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a;">Intro Call Approved! ✅</h2>
          <p>Great news! <strong>${therapist.name}</strong> has approved your intro call request.</p>
          <p>They will reach out to you at <strong>${request.phone}</strong> around your preferred time.</p>
          <p>If you have questions, you can also message them through the platform.</p>
        </div>`;
      sendEmail(request.email, `Intro Call Approved — ${therapist.name}`, html).catch(() => {});
    } else if (status === 'rejected') {
      const html = `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">Intro Call Update</h2>
          <p>${therapist.name} is unable to accommodate your intro call request at this time.</p>
          <p>You may try requesting with another therapist or at a different time.</p>
        </div>`;
      sendEmail(request.email, `Intro Call Update — ${therapist.name}`, html).catch(() => {});
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/intro-calls/admin — admin sees all (added to admin routes later)
router.get('/all', protect, async (req, res) => {
  try {
    if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin only' });
    const requests = await IntroCallRequest.find()
      .populate('clientId', 'name email')
      .populate('therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
