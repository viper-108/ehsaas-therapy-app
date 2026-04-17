import express from 'express';
import GroupSession from '../models/GroupSession.js';
import Payment from '../models/Payment.js';
import { protect, clientOnly, adminOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { generateICS } from '../utils/calendar.js';

const router = express.Router();

// GET /api/group-sessions — list upcoming open group sessions (public)
router.get('/', async (req, res) => {
  try {
    const sessions = await GroupSession.find({ status: { $in: ['open'] }, date: { $gte: new Date() } })
      .populate('therapistId', 'name title image specializations')
      .sort({ date: 1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/group-sessions/all — admin sees all
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await GroupSession.find()
      .populate('therapistId', 'name title')
      .populate('participants.clientId', 'name email')
      .sort({ date: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/group-sessions/my — client's registered group sessions
router.get('/my', protect, clientOnly, async (req, res) => {
  try {
    const sessions = await GroupSession.find({ 'participants.clientId': req.userId })
      .populate('therapistId', 'name title image')
      .sort({ date: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/group-sessions/:id — single group session
router.get('/:id', async (req, res) => {
  try {
    const session = await GroupSession.findById(req.params.id)
      .populate('therapistId', 'name title image specializations bio')
      .populate('participants.clientId', 'name');
    if (!session) return res.status(404).json({ message: 'Group session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/group-sessions — admin creates group session
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, therapistId, date, startTime, endTime, duration, maxParticipants, amount } = req.body;

    const session = await GroupSession.create({
      title, description, therapistId,
      adminCreatedBy: req.userId,
      date: new Date(date), startTime, endTime, duration,
      maxParticipants, amount, status: 'open',
    });

    const populated = await session.populate('therapistId', 'name title');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create group session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/group-sessions/:id/register — client registers + pays
router.post('/:id/register', protect, clientOnly, async (req, res) => {
  try {
    const session = await GroupSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Group session not found' });
    if (session.status !== 'open') return res.status(400).json({ message: 'This group session is no longer accepting registrations' });
    if (session.participants.length >= session.maxParticipants) {
      session.status = 'full';
      await session.save();
      return res.status(400).json({ message: 'This group session is full' });
    }

    // Check if already registered
    const already = session.participants.find(p => p.clientId.toString() === req.userId);
    if (already) return res.status(400).json({ message: 'You are already registered for this session' });

    // Create payment record
    const payment = await Payment.create({
      clientId: req.userId,
      therapistId: session.therapistId,
      amount: session.amount,
      status: 'completed', // for now direct completion; integrate with PhonePe for real
      paymentMethod: 'phonepe',
    });

    session.participants.push({ clientId: req.userId, paymentId: payment._id, joinedAt: new Date() });
    if (session.participants.length >= session.maxParticipants) {
      session.status = 'full';
    }
    await session.save();

    // Send confirmation email with ICS
    try {
      const Client = (await import('../models/Client.js')).default;
      const Therapist = (await import('../models/Therapist.js')).default;
      const client = await Client.findById(req.userId);
      const therapist = await Therapist.findById(session.therapistId);

      if (client && therapist) {
        const ics = generateICS({
          title: `Group Therapy: ${session.title}`,
          description: `Group therapy session with ${therapist.name}\n${session.description}\nAmount: ₹${session.amount}`,
          startDate: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          organizerEmail: 'sessions.ehsaas@gmail.com',
          attendees: [{ name: client.name, email: client.email }],
        });

        const html = `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">Group Therapy Registration Confirmed! ✅</h2>
            <p>You're registered for <strong>${session.title}</strong></p>
            <table style="width:100%; border-collapse:collapse; margin:15px 0;">
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Therapist</td><td style="padding:8px; border:1px solid #ddd;">${therapist.name}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Date</td><td style="padding:8px; border:1px solid #ddd;">${new Date(session.date).toLocaleDateString('en-IN')}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Time</td><td style="padding:8px; border:1px solid #ddd;">${session.startTime} - ${session.endTime}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Amount Paid</td><td style="padding:8px; border:1px solid #ddd;">₹${session.amount}</td></tr>
            </table>
            <p>A calendar invite is attached. See you there!</p>
          </div>`;

        sendEmail(client.email, `Group Therapy Confirmed — ${session.title}`, html, [
          { filename: 'group-session.ics', content: ics, contentType: 'text/calendar' }
        ]).catch(() => {});
      }
    } catch (emailErr) {
      console.error('Group session email error:', emailErr);
    }

    res.json({ message: 'Registered successfully', session });
  } catch (error) {
    console.error('Register group session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/group-sessions/:id — admin updates
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'date', 'startTime', 'endTime', 'duration', 'maxParticipants', 'amount', 'status', 'therapistId'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.date) updates.date = new Date(updates.date);

    const session = await GroupSession.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('therapistId', 'name title');
    if (!session) return res.status(404).json({ message: 'Not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/group-sessions/:id — admin cancels
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const session = await GroupSession.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!session) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Cancelled', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
