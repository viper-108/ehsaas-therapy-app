import express from 'express';
import Therapist from '../models/Therapist.js';
import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import { protect, therapistOnly } from '../middleware/auth.js';
import { sendOnboardingNotification } from '../utils/email.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

// GET /api/therapists - list all approved therapists (public)
router.get('/', async (req, res) => {
  try {
    const { specialization, language, search } = req.query;
    let query = { isApproved: true };

    if (specialization) {
      query.specializations = { $in: [new RegExp(specialization, 'i')] };
    }
    if (language) {
      query.languages = { $in: [new RegExp(language, 'i')] };
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { specializations: { $in: [new RegExp(search, 'i')] } },
        { bio: new RegExp(search, 'i') },
      ];
    }

    const therapists = await Therapist.find(query).select('-password');

    // Convert pricing Map to plain objects
    const result = therapists.map(t => {
      const obj = t.toObject();
      if (obj.pricing instanceof Map) {
        obj.pricing = Object.fromEntries(obj.pricing);
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    console.error('Get therapists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/:id - get single therapist (public)
router.get('/:id', async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id).select('-password');
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }
    const obj = therapist.toObject();
    if (obj.pricing instanceof Map) {
      obj.pricing = Object.fromEntries(obj.pricing);
    }
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/:id/available-slots?date=2024-01-15
router.get('/:id/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const therapist = await Therapist.findById(req.params.id);
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    // Find the availability for this day
    const dayAvailability = therapist.availability.find(
      a => a.dayOfWeek === dayOfWeek && a.isAvailable
    );

    if (!dayAvailability) {
      return res.json({ slots: [], message: 'Therapist not available on this day' });
    }

    // Get existing sessions for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSessions = await Session.find({
      therapistId: req.params.id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled'] }
    });

    const bookedTimes = bookedSessions.map(s => s.startTime);

    // Check max sessions per day
    const maxPerDay = therapist.maxSessionsPerDay || 8;
    if (bookedSessions.length >= maxPerDay) {
      return res.json({ slots: [], message: 'All sessions are booked for this day', fullyBooked: true });
    }

    // Generate available slots (hourly)
    const slots = [];
    const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
    const endHour = parseInt(dayAvailability.endTime.split(':')[0]);

    for (let hour = startHour; hour < endHour; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      if (!bookedTimes.includes(timeStr)) {
        slots.push({
          time: timeStr,
          available: true
        });
      }
    }

    res.json({ slots, maxPerDay, bookedCount: bookedSessions.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== THERAPIST ONBOARDING ====================

// POST /api/therapists/onboard - accept T&C and request approval
router.post('/onboard', protect, therapistOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.userId);
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    if (therapist.isOnboarded) {
      return res.status(400).json({ message: 'Already onboarded', status: therapist.onboardingStatus });
    }

    therapist.isOnboarded = true;
    therapist.onboardingStatus = 'pending_approval';
    await therapist.save();

    // Notify admins about new onboarding request (fire and forget)
    sendOnboardingNotification(therapist).catch(err => console.error('[EMAIL] Onboarding notification error:', err));
    console.log(`[ONBOARDING] Therapist ${therapist.name} (${therapist.email}) requested approval`);

    const obj = therapist.toPublicJSON();
    res.json({
      message: 'Onboarding complete. Your profile is under review.',
      status: 'pending_approval',
      user: obj
    });
  } catch (error) {
    console.error('Onboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== THERAPIST DASHBOARD (Protected) ====================

// GET /api/therapists/dashboard/profile
router.get('/dashboard/profile', protect, therapistOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.userId).select('-password');
    const obj = therapist.toObject();
    if (obj.pricing instanceof Map) {
      obj.pricing = Object.fromEntries(obj.pricing);
    }
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/profile
router.put('/dashboard/profile', protect, therapistOnly, async (req, res) => {
  try {
    const allowed = ['name', 'title', 'phone', 'specializations', 'experience', 'bio', 'languages', 'pricing', 'calendlyLink', 'image', 'maxSessionsPerDay', 'educationBackground', 'courses', 'highestEducation'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const therapist = await Therapist.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    const obj = therapist.toObject();
    if (obj.pricing instanceof Map) {
      obj.pricing = Object.fromEntries(obj.pricing);
    }
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/availability
router.put('/dashboard/availability', protect, therapistOnly, async (req, res) => {
  try {
    const { availability } = req.body;
    const therapist = await Therapist.findByIdAndUpdate(
      req.userId,
      { availability },
      { new: true }
    ).select('-password');
    res.json(therapist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/dashboard/sessions
router.get('/dashboard/sessions', protect, therapistOnly, async (req, res) => {
  try {
    const { status, timeframe } = req.query;
    let query = { therapistId: req.userId };

    if (status) query.status = status;

    if (timeframe === 'upcoming') {
      query.date = { $gte: new Date() };
      query.status = 'scheduled';
    } else if (timeframe === 'past') {
      query.$or = [
        { date: { $lt: new Date() } },
        { status: { $in: ['completed', 'cancelled', 'no-show'] } }
      ];
    }

    const sessions = await Session.find(query)
      .populate('clientId', 'name email phone')
      .sort({ date: timeframe === 'upcoming' ? 1 : -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/dashboard/stats
router.get('/dashboard/stats', protect, therapistOnly, async (req, res) => {
  try {
    const allSessions = await Session.find({ therapistId: req.userId });
    const completedSessions = allSessions.filter(s => s.status === 'completed');
    const upcomingSessions = allSessions.filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date());

    const totalHours = completedSessions.reduce((sum, s) => sum + (s.duration / 60), 0);

    const payments = await Payment.find({ therapistId: req.userId, status: 'completed' });
    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly earnings (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyPayments = await Payment.find({
      therapistId: req.userId,
      status: 'completed',
      createdAt: { $gte: sixMonthsAgo }
    });

    const monthlyEarnings = {};
    monthlyPayments.forEach(p => {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyEarnings[key] = (monthlyEarnings[key] || 0) + p.amount;
    });

    res.json({
      totalSessions: allSessions.length,
      completedSessions: completedSessions.length,
      upcomingSessions: upcomingSessions.length,
      totalHours: Math.round(totalHours * 10) / 10,
      totalEarnings,
      monthlyEarnings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/sessions/:sessionId/status
router.put('/dashboard/sessions/:sessionId/status', protect, therapistOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.sessionId, therapistId: req.userId },
      { status },
      { new: true }
    ).populate('clientId', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // If completed, update therapist stats
    if (status === 'completed') {
      await Therapist.findByIdAndUpdate(req.userId, {
        $inc: { totalSessions: 1, totalHours: session.duration / 60 }
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SESSION NOTES (Structured) ====================

// GET /api/therapists/dashboard/sessions/:sessionId/notes
router.get('/dashboard/sessions/:sessionId/notes', protect, therapistOnly, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, therapistId: req.userId })
      .populate('clientId', 'name');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Calculate session number (count of this therapist-client pair's completed sessions up to this date)
    const sessionNumber = await Session.countDocuments({
      therapistId: req.userId,
      clientId: session.clientId._id,
      status: 'completed',
      date: { $lte: session.date },
    });

    const therapist = await Therapist.findById(req.userId).select('name');

    res.json({
      notes: session.notes || {},
      sessionNumber,
      clientName: session.clientId?.name || 'Client',
      therapistName: therapist?.name || 'Therapist',
      sessionDate: session.date,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/sessions/:sessionId/notes
router.put('/dashboard/sessions/:sessionId/notes', protect, therapistOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    const session = await Session.findOne({ _id: req.params.sessionId, therapistId: req.userId });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'completed') return res.status(400).json({ message: 'Can only add notes to completed sessions' });

    // Validate mandatory fields
    const mandatory = ['clientMood', 'keyTopicsDiscussed', 'importantNotes', 'interventionsOrSkillsUsed', 'plannedAgreedTasks'];
    for (const field of mandatory) {
      if (!notes?.[field]?.trim()) {
        return res.status(400).json({ message: `${field.replace(/([A-Z])/g, ' $1').trim()} is required` });
      }
    }

    session.notes = notes;
    await session.save();
    res.json({ notes: session.notes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== CLIENT HISTORY ====================

// GET /api/therapists/dashboard/client-history/:clientId
router.get('/dashboard/client-history/:clientId', protect, therapistOnly, async (req, res) => {
  try {
    const ClientHistory = (await import('../models/ClientHistory.js')).default;
    const history = await ClientHistory.findOne({ clientId: req.params.clientId, therapistId: req.userId });
    res.json(history || null);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/therapists/dashboard/client-history
router.post('/dashboard/client-history', protect, therapistOnly, async (req, res) => {
  try {
    const ClientHistory = (await import('../models/ClientHistory.js')).default;
    const { clientId, ...data } = req.body;

    // Check if already exists (upsert)
    const existing = await ClientHistory.findOne({ clientId, therapistId: req.userId });
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      return res.json(existing);
    }

    const history = await ClientHistory.create({
      clientId,
      therapistId: req.userId,
      ...data,
    });
    res.status(201).json(history);
  } catch (error) {
    console.error('Client history error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// PUT /api/therapists/dashboard/client-history/:clientId
router.put('/dashboard/client-history/:clientId', protect, therapistOnly, async (req, res) => {
  try {
    const ClientHistory = (await import('../models/ClientHistory.js')).default;
    const history = await ClientHistory.findOneAndUpdate(
      { clientId: req.params.clientId, therapistId: req.userId },
      req.body,
      { new: true }
    );
    if (!history) return res.status(404).json({ message: 'Client history not found' });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/dashboard/my-clients — all clients who've booked with this therapist
router.get('/dashboard/my-clients', protect, therapistOnly, async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default;
    const therapistOid = new mongoose.Types.ObjectId(req.userId);
    const clientIds = await Session.find({ therapistId: therapistOid }).distinct('clientId');
    const Client = (await import('../models/Client.js')).default;
    const clients = await Client.find({ _id: { $in: clientIds } }).select('name email').sort({ name: 1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/dashboard/clients-needing-history
router.get('/dashboard/clients-needing-history', protect, therapistOnly, async (req, res) => {
  try {
    const ClientHistory = (await import('../models/ClientHistory.js')).default;
    const mongoose = (await import('mongoose')).default;
    const therapistOid = new mongoose.Types.ObjectId(req.userId);

    // Find all clients with completed sessions but no history
    const clientsWithSessions = await Session.find({
      therapistId: therapistOid,
      status: 'completed'
    }).distinct('clientId');

    const clientsWithHistory = await ClientHistory.find({
      therapistId: therapistOid,
    }).distinct('clientId');

    const historyIds = new Set(clientsWithHistory.map(id => id.toString()));
    const needingHistory = clientsWithSessions.filter(id => !historyIds.has(id.toString()));

    const Client = (await import('../models/Client.js')).default;
    const clients = await Client.find({ _id: { $in: needingHistory } }).select('name email');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== RESUME UPLOAD ====================

// POST /api/therapists/dashboard/resume
router.post('/dashboard/resume', protect, therapistOnly, async (req, res) => {
  const { uploadResume } = await import('../middleware/upload.js');
  uploadResume(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    try {
      const therapist = await Therapist.findByIdAndUpdate(
        req.userId,
        { resume: `/uploads/resumes/${req.file.filename}` },
        { new: true }
      ).select('-password');
      res.json({ resume: therapist.resume, message: 'Resume uploaded successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
});

// ==================== INTERVIEWS ====================

// GET /api/therapists/dashboard/interviews
router.get('/dashboard/interviews', protect, therapistOnly, async (req, res) => {
  try {
    const InterviewSchedule = (await import('../models/InterviewSchedule.js')).default;
    const interviews = await InterviewSchedule.find({ therapistId: req.userId })
      .populate('adminId', 'name email')
      .sort({ scheduledDate: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== PROGRESS TRACKING ====================

// POST /api/therapists/dashboard/progress — save progress entry for a session
router.post('/dashboard/progress', protect, therapistOnly, async (req, res) => {
  try {
    const ProgressEntry = (await import('../models/ProgressEntry.js')).default;
    const { sessionId, clientId, moodRating, anxietyLevel, overallProgress, notes } = req.body;

    const session = await Session.findOne({ _id: sessionId, therapistId: req.userId });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const entry = await ProgressEntry.findOneAndUpdate(
      { sessionId },
      { clientId, therapistId: req.userId, moodRating, anxietyLevel, overallProgress, notes, date: session.date },
      { upsert: true, new: true }
    );

    // Link to session
    session.progressId = entry._id;
    await session.save();

    res.json(entry);
  } catch (error) {
    console.error('Progress save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/dashboard/progress/:clientId — progress history for a client
router.get('/dashboard/progress/:clientId', protect, therapistOnly, async (req, res) => {
  try {
    const ProgressEntry = (await import('../models/ProgressEntry.js')).default;
    const entries = await ProgressEntry.find({ clientId: req.params.clientId, therapistId: req.userId })
      .sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
