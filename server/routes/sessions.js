import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session.js';
import Therapist from '../models/Therapist.js';
import Waitlist from '../models/Waitlist.js';
import { protect, clientOnly } from '../middleware/auth.js';

const router = express.Router();

// Helper: calculate end time
const calcEndTime = (startTime, duration) => {
  const startHour = parseInt(startTime.split(':')[0]);
  const startMin = parseInt(startTime.split(':')[1]);
  const endMin = startMin + duration;
  const endHour = startHour + Math.floor(endMin / 60);
  return `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
};

// POST /api/sessions - book a session (client only)
router.post('/', protect, clientOnly, async (req, res) => {
  try {
    const { therapistId, date, startTime, duration, sessionType } = req.body;

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    if (therapist.accountStatus === 'past') {
      return res.status(400).json({ message: 'This therapist is no longer available. Please choose another therapist.' });
    }

    const pricing = therapist.pricing instanceof Map ? Object.fromEntries(therapist.pricing) : therapist.pricing;
    const amount = pricing[String(duration)];
    if (!amount) return res.status(400).json({ message: `Therapist does not offer ${duration} minute sessions` });

    const endTime = calcEndTime(startTime, duration);

    // Max sessions per day check
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const dayCount = await Session.countDocuments({
      therapistId, date: { $gte: dayStart, $lte: dayEnd }, status: 'scheduled'
    });
    const maxPerDay = therapist.maxSessionsPerDay || 8;
    if (dayCount >= maxPerDay) {
      return res.status(409).json({ message: 'All sessions are booked for this day. Please try another date.', fullyBooked: true });
    }

    const existingSession = await Session.findOne({
      therapistId, date: new Date(date), startTime, status: 'scheduled'
    });
    if (existingSession) return res.status(409).json({ message: 'This time slot is already booked' });

    const session = await Session.create({
      clientId: req.userId, therapistId, date: new Date(date),
      startTime, endTime, duration, amount,
      sessionType: sessionType || 'individual', status: 'scheduled'
    });

    // Check if client has switched therapists 3+ times (fire-and-forget)
    import('../utils/clientFlags.js').then(m => m.checkTherapistChangeFlag(req.userId).catch(e => console.error('[FLAG]', e)));

    const populated = await session.populate([
      { path: 'therapistId', select: 'name title image email' },
      { path: 'clientId', select: 'name email' }
    ]);

    // Send calendar .ics email (fire and forget)
    try {
      const { generateSessionICS } = await import('../utils/calendar.js');
      const { sendEmail } = await import('../utils/email.js');
      const Client = (await import('../models/Client.js')).default;
      const fullClient = await Client.findById(req.userId);
      const fullTherapist = await Therapist.findById(therapistId);

      if (fullClient && fullTherapist) {
        const ics = await generateSessionICS(session, fullTherapist, fullClient);
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #16a34a;">Session Booked! ✅</h2>
            <p>Your therapy session has been confirmed.</p>
            <table style="width:100%; border-collapse:collapse; margin:15px 0;">
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Therapist</td><td style="padding:8px; border:1px solid #ddd;">${fullTherapist.name}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Date</td><td style="padding:8px; border:1px solid #ddd;">${new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Time</td><td style="padding:8px; border:1px solid #ddd;">${startTime} - ${endTime}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Duration</td><td style="padding:8px; border:1px solid #ddd;">${duration} minutes</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Amount</td><td style="padding:8px; border:1px solid #ddd;">₹${amount}</td></tr>
            </table>
            <p><strong>Cancellation Policy:</strong> Sessions cannot be cancelled within 24 hours of the scheduled time.</p>
            <p>A calendar invite is attached. Please add it to your calendar.</p>
          </div>`;
        const attachments = [{ filename: 'session.ics', content: ics, contentType: 'text/calendar' }];

        // Send to client
        sendEmail(fullClient.email, `Session Confirmed — ${fullTherapist.name}`, html, attachments).catch(e => console.error('[EMAIL] Client session email error:', e));
        // Send to therapist
        const therapistHtml = html.replace('Your therapy session', `Session with ${fullClient.name}`);
        sendEmail(fullTherapist.email, `New Session Booked — ${fullClient.name}`, therapistHtml, attachments).catch(e => console.error('[EMAIL] Therapist session email error:', e));

        session.calendarSent = true;
        await session.save();
      }
    } catch (calErr) {
      console.error('[CALENDAR] Email error:', calErr.message);
    }

    // Audit log
    try {
      const { logAudit } = await import('../middleware/audit.js');
      logAudit(req, 'session_booked', 'Session', session._id, { therapistId, date, duration, amount });
    } catch {}

    res.status(201).json(populated);
  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sessions/recurring - book 4 weekly sessions
router.post('/recurring', protect, clientOnly, async (req, res) => {
  try {
    const { therapistId, date, startTime, duration, sessionType, weeks } = req.body;
    const numWeeks = weeks || 4;

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    if (therapist.accountStatus === 'past') {
      return res.status(400).json({ message: 'This therapist is no longer available. Please choose another therapist.' });
    }

    const pricing = therapist.pricing instanceof Map ? Object.fromEntries(therapist.pricing) : therapist.pricing;
    const amount = pricing[String(duration)];
    if (!amount) return res.status(400).json({ message: `Therapist does not offer ${duration} minute sessions` });

    const endTime = calcEndTime(startTime, duration);
    const recurringGroupId = uuidv4();
    const sessions = [];

    // Check all slots first
    for (let i = 0; i < numWeeks; i++) {
      const sessionDate = new Date(date);
      sessionDate.setDate(sessionDate.getDate() + (i * 7));

      const existing = await Session.findOne({
        therapistId, date: sessionDate, startTime, status: 'scheduled'
      });
      if (existing) {
        return res.status(409).json({
          message: `Slot on ${sessionDate.toISOString().split('T')[0]} at ${startTime} is already booked`,
          conflictWeek: i + 1
        });
      }
    }

    // All clear, create all sessions
    for (let i = 0; i < numWeeks; i++) {
      const sessionDate = new Date(date);
      sessionDate.setDate(sessionDate.getDate() + (i * 7));

      const session = await Session.create({
        clientId: req.userId, therapistId, date: sessionDate,
        startTime, endTime, duration, amount,
        sessionType: sessionType || 'individual', status: 'scheduled',
        isRecurring: true, recurringGroupId,
      });
      sessions.push(session);
    }

    const populated = await Session.find({ recurringGroupId })
      .populate('therapistId', 'name title image')
      .populate('clientId', 'name email');

    res.status(201).json({ recurringGroupId, sessions: populated });
  } catch (error) {
    console.error('Recurring booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sessions/recurring/:groupId - cancel all sessions in a recurring group
router.delete('/recurring/:groupId', protect, clientOnly, async (req, res) => {
  try {
    const sessions = await Session.find({
      recurringGroupId: req.params.groupId,
      clientId: req.userId,
      status: 'scheduled'
    });

    if (sessions.length === 0) return res.status(404).json({ message: 'No scheduled sessions found in this group' });

    await Session.updateMany(
      { recurringGroupId: req.params.groupId, clientId: req.userId, status: 'scheduled' },
      { status: 'cancelled' }
    );

    res.json({ message: `Cancelled ${sessions.length} sessions`, count: sessions.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sessions/my - get client's sessions
router.get('/my', protect, clientOnly, async (req, res) => {
  try {
    const { timeframe } = req.query;
    let query = { clientId: req.userId };

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
      .populate('therapistId', 'name title image rating')
      .populate('reviewId')
      .sort({ date: timeframe === 'upcoming' ? 1 : -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/sessions/:id/cancel - cancel a session + notify waitlist
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isOwner = (req.userRole === 'client' && session.clientId.toString() === req.userId) ||
                    (req.userRole === 'therapist' && session.therapistId.toString() === req.userId);
    if (!isOwner) return res.status(403).json({ message: 'Not authorized' });

    // 24-hour cancellation restriction for clients
    if (req.userRole === 'client') {
      const sessionDateTime = new Date(session.date);
      const [h, m] = session.startTime.split(':');
      sessionDateTime.setHours(parseInt(h), parseInt(m), 0, 0);
      const hoursUntilSession = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSession < 24) {
        return res.status(400).json({
          message: 'Sessions cannot be cancelled within 24 hours of the scheduled time. Please contact support for assistance.'
        });
      }
    }

    session.status = 'cancelled';
    await session.save();

    // Check if client should be flagged for high cancellations (fire-and-forget)
    if (req.userRole === 'client') {
      import('../utils/clientFlags.js').then(m => m.checkCancellationFlag(session.clientId).catch(e => console.error('[FLAG]', e)));
    }

    // Notify waitlisted clients for this therapist+date
    try {
      const startOfDay = new Date(session.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(session.date);
      endOfDay.setHours(23, 59, 59, 999);

      const waitlistEntries = await Waitlist.find({
        therapistId: session.therapistId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'waiting'
      }).populate('clientId', 'name email');

      if (waitlistEntries.length > 0) {
        const { sendEmail } = await import('../utils/email.js');
        const therapist = await Therapist.findById(session.therapistId);

        for (const entry of waitlistEntries) {
          entry.status = 'notified';
          await entry.save();

          // Send notification email (fire and forget)
          if (entry.clientId?.email) {
            const html = `<p>A slot has opened up with <strong>${therapist?.name || 'your therapist'}</strong> on ${session.date.toLocaleDateString('en-IN')}. Book now before it fills up!</p>`;
            sendEmail(entry.clientId.email, `Slot Available — ${therapist?.name || 'Ehsaas'}`, html).catch(() => {});
          }
        }
        console.log(`[WAITLIST] Notified ${waitlistEntries.length} clients about cancellation`);
      }
    } catch (waitlistError) {
      console.error('Waitlist notification error:', waitlistError);
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/sessions/:id/status — therapist/admin marks session as completed/no-show
router.put('/:id/status', protect, async (req, res) => {
  try {
    if (req.userRole !== 'therapist' && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Therapist or admin only' });
    }
    const { status } = req.body;
    if (!['completed', 'no-show', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (req.userRole === 'therapist' && String(session.therapistId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your session' });
    }
    session.status = status;
    await session.save();

    // Trigger appropriate flag check
    if (status === 'no-show') {
      import('../utils/clientFlags.js').then(m => m.checkNoShowFlag(session.clientId).catch(e => console.error('[FLAG]', e)));
    } else if (status === 'cancelled') {
      import('../utils/clientFlags.js').then(m => m.checkCancellationFlag(session.clientId).catch(e => console.error('[FLAG]', e)));
    }

    res.json(session);
  } catch (error) {
    console.error('Set status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sessions/my/progress — client sees their progress data
router.get('/my/progress', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Client only' });
    const ProgressEntry = (await import('../models/ProgressEntry.js')).default;
    const entries = await ProgressEntry.find({ clientId: req.userId })
      .populate('therapistId', 'name')
      .sort({ date: 1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sessions/:id/feedback — client submits feedback survey
router.post('/:id/feedback', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Client only' });
    const FeedbackSurvey = (await import('../models/FeedbackSurvey.js')).default;
    const Notification = (await import('../models/Notification.js')).default;

    const session = await Session.findOne({ _id: req.params.id, clientId: req.userId, status: 'completed' });
    if (!session) return res.status(404).json({ message: 'Completed session not found' });

    // Check if already submitted
    const existing = await FeedbackSurvey.findOne({ sessionId: session._id });
    if (existing) return res.status(400).json({ message: 'Feedback already submitted for this session' });

    const { responses, overallSatisfaction, wouldRecommend } = req.body;

    const survey = await FeedbackSurvey.create({
      sessionId: session._id,
      clientId: req.userId,
      therapistId: session.therapistId,
      responses: responses || [],
      overallSatisfaction,
      wouldRecommend,
    });

    session.feedbackId = survey._id;
    await session.save();

    // Notify therapist
    Notification.notify(session.therapistId, 'therapist', 'feedback',
      'New Feedback Received',
      'A client submitted feedback for a recent session',
      '/therapist-dashboard?tab=past'
    ).catch(() => {});

    res.status(201).json(survey);
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
