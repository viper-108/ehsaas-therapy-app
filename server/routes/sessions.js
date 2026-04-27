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
    const baseAmount = pricing[String(duration)];
    if (!baseAmount) return res.status(400).json({ message: `Therapist does not offer ${duration} minute sessions` });

    // Apply approved per-client price negotiation (uses negotiated price if approved, else max price)
    let amount = baseAmount;
    try {
      const { getPriceForClient } = await import('./priceNegotiations.js');
      amount = await getPriceForClient(therapistId, req.userId, duration);
    } catch {}

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

    // Ensure active relationship exists (used for transfer access control)
    try {
      const { ensureActiveRelationship } = await import('../utils/relationshipAccess.js');
      ensureActiveRelationship(therapistId, req.userId).catch(() => {});
    } catch {}

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
    const baseAmount = pricing[String(duration)];
    if (!baseAmount) return res.status(400).json({ message: `Therapist does not offer ${duration} minute sessions` });

    // Apply approved per-client price negotiation (uses negotiated price if approved, else max price)
    let amount = baseAmount;
    try {
      const { getPriceForClient } = await import('./priceNegotiations.js');
      amount = await getPriceForClient(therapistId, req.userId, duration);
    } catch {}

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

    // Ensure active relationship exists
    try {
      const { ensureActiveRelationship } = await import('../utils/relationshipAccess.js');
      ensureActiveRelationship(therapistId, req.userId).catch(() => {});
    } catch {}

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
// "upcoming" = status='scheduled' AND endTime hasn't passed yet (so an in-progress session stays here)
// "past" = anything else (status in [completed/cancelled/no-show], OR scheduled session whose endTime passed)
router.get('/my', protect, clientOnly, async (req, res) => {
  try {
    const { timeframe } = req.query;
    const all = await Session.find({ clientId: req.userId })
      .populate('therapistId', 'name title image rating')
      .populate('reviewId')
      .sort({ date: -1 });

    const now = new Date();
    const sessionEndAt = (s) => {
      const d = new Date(s.date);
      const [h, m] = (s.endTime || '00:00').split(':');
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      return d;
    };
    const isUpcoming = (s) => s.status === 'scheduled' && sessionEndAt(s) >= now;

    let sessions = all;
    if (timeframe === 'upcoming') sessions = all.filter(isUpcoming).sort((a, b) => sessionEndAt(a) - sessionEndAt(b));
    else if (timeframe === 'past') sessions = all.filter(s => !isUpcoming(s));

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/sessions/:id/cancel - cancel a session + notify waitlist
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const session = await Session.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('therapistId', 'name email');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isClient = req.userRole === 'client' && session.clientId._id.toString() === req.userId;
    const isTherapist = req.userRole === 'therapist' && session.therapistId._id.toString() === req.userId;
    const isAdmin = req.userRole === 'admin';
    if (!isClient && !isTherapist && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    // Therapist must provide a reason
    if (isTherapist && (!reason || reason.trim().length < 5)) {
      return res.status(400).json({ message: 'A reason for cancellation is required (minimum 5 characters).' });
    }

    // 24-hour cancellation restriction for clients
    if (isClient) {
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
    session.cancelledBy = isClient ? 'client' : isTherapist ? 'therapist' : 'admin';
    session.cancellationReason = reason || '';
    session.cancelledAt = new Date();
    // If therapist cancels: existing payment becomes "credit" the client can use to reschedule
    if (isTherapist && session.paymentStatus === 'paid') {
      session.paymentStatus = 'refunded';
    }
    await session.save();

    // If therapist cancels: send email to client with reason + reschedule link
    if (isTherapist) {
      try {
        const { sendEmail } = await import('../utils/email.js');
        const Notification = (await import('../models/Notification.js')).default;
        const sessionDate = new Date(session.date);
        const dateStr = sessionDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const baseUrl = process.env.CLIENT_URL || '';
        const rescheduleUrl = `${baseUrl}/psychologist/${session.therapistId._id}?reschedule=${session._id}`;
        const hasCredit = session.paymentStatus === 'refunded';
        const html = `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Your session has been cancelled by your therapist</h2>
            <p>Hi ${session.clientId?.name || 'there'},</p>
            <p>Your therapist <strong>${session.therapistId?.name || ''}</strong> had to cancel the following session:</p>
            <table style="width:100%; border-collapse:collapse; margin:15px 0;">
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Date</td><td style="padding:8px; border:1px solid #ddd;">${dateStr}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Time</td><td style="padding:8px; border:1px solid #ddd;">${session.startTime}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Reason</td><td style="padding:8px; border:1px solid #ddd;">${reason}</td></tr>
            </table>
            <p style="background:#fef3c7;padding:12px;border-radius:6px;border-left:4px solid #f59e0b;">
              ${hasCredit
                ? '<strong>Good news:</strong> Your previous payment is preserved as credit. When you reschedule, you will not be charged again.'
                : 'Please choose a new date that works for you. Payment will be required at the time of rescheduling.'}
            </p>
            <p style="text-align:center;margin:24px 0;">
              <a href="${rescheduleUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Reschedule Now</a>
            </p>
            <p style="color:#666;font-size:13px;">Questions? Reach out to us at sessions@ehsaastherapycentre.com.</p>
          </div>`;
        if (session.clientId?.email) {
          sendEmail(session.clientId.email, 'Session cancelled by your therapist — please reschedule', html).catch(e => console.error('[CANCEL EMAIL]', e.message));
        }
        Notification.notify(session.clientId._id, 'client', 'cancellation',
          'Session cancelled by therapist',
          `${session.therapistId?.name || 'Your therapist'} cancelled: ${reason}. ${hasCredit ? 'Use your credit to reschedule.' : 'Please reschedule when ready.'}`,
          rescheduleUrl
        ).catch(() => {});
      } catch (e) { console.error('[THERAPIST-CANCEL]', e.message); }
    }

    // Check if client should be flagged for high cancellations (fire-and-forget)
    if (isClient) {
      import('../utils/clientFlags.js').then(m => m.checkCancellationFlag(session.clientId._id).catch(e => console.error('[FLAG]', e)));
    }

    // Notify waitlisted clients for this therapist+date
    try {
      const startOfDay = new Date(session.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(session.date);
      endOfDay.setHours(23, 59, 59, 999);

      const therapistIdForWaitlist = session.therapistId._id || session.therapistId;
      const waitlistEntries = await Waitlist.find({
        therapistId: therapistIdForWaitlist,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'waiting'
      }).populate('clientId', 'name email');

      if (waitlistEntries.length > 0) {
        const { sendEmail } = await import('../utils/email.js');
        const Notification = (await import('../models/Notification.js')).default;
        const therapist = session.therapistId?.name ? session.therapistId : await Therapist.findById(therapistIdForWaitlist);
        const dateStr = new Date(session.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const baseUrl = process.env.CLIENT_URL || '';
        const bookUrl = `${baseUrl}/psychologist/${therapistIdForWaitlist}`;

        for (const entry of waitlistEntries) {
          entry.status = 'notified';
          await entry.save();

          // Send notification email (fire-and-forget)
          if (entry.clientId?.email) {
            const html = `
              <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#16a34a;">A slot just opened up!</h2>
                <p>Hi ${entry.clientId?.name || 'there'},</p>
                <p>A session slot has opened up with <strong>${therapist?.name || 'your therapist'}</strong> on <strong>${dateStr}</strong>.</p>
                <p style="text-align:center;margin:24px 0;">
                  <a href="${bookUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Book This Slot</a>
                </p>
                <p style="color:#666;font-size:13px;">Hurry — slots usually go fast. If someone else books this slot first, you'll keep your place on the waitlist for the next opening.</p>
              </div>`;
            sendEmail(entry.clientId.email, `Slot opened with ${therapist?.name || 'your therapist'} — book now`, html).catch(() => {});
          }

          // In-app notification (always fire, even if no email)
          Notification.notify(
            entry.clientId?._id || entry.clientId,
            'client',
            'waitlist_open',
            'A waitlisted slot just opened!',
            `${therapist?.name || 'Your therapist'} has an opening on ${dateStr}. Tap to book.`,
            bookUrl
          ).catch(() => {});
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
    const session = await Session.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('therapistId', 'name email');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (req.userRole === 'therapist' && String(session.therapistId._id) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your session' });
    }
    session.status = status;
    if (status === 'no-show') session.noShowEmailSent = true;
    await session.save();

    // Trigger appropriate flag check
    if (status === 'no-show') {
      import('../utils/clientFlags.js').then(m => m.checkNoShowFlag(session.clientId._id).catch(e => console.error('[FLAG]', e)));

      // Send no-show email to client
      try {
        const { sendEmail } = await import('../utils/email.js');
        const Notification = (await import('../models/Notification.js')).default;
        const sessionDate = new Date(session.date);
        const dateStr = sessionDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
        const html = `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Session marked as no-show</h2>
            <p>Hi ${session.clientId?.name || 'there'},</p>
            <p>Your therapist has marked your scheduled session as a no-show:</p>
            <table style="width:100%; border-collapse:collapse; margin:15px 0;">
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Therapist</td><td style="padding:8px; border:1px solid #ddd;">${session.therapistId?.name || ''}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Date</td><td style="padding:8px; border:1px solid #ddd;">${dateStr}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Time</td><td style="padding:8px; border:1px solid #ddd;">${session.startTime}</td></tr>
            </table>
            <p>Frequent no-shows may affect future booking. If something came up, please reach out to <a href="mailto:sessions@ehsaastherapycentre.com">sessions@ehsaastherapycentre.com</a>.</p>
          </div>`;
        if (session.clientId?.email) {
          sendEmail(session.clientId.email, 'Session marked as no-show', html).catch(e => console.error('[NOSHOW MANUAL]', e.message));
        }
        Notification.notify(session.clientId._id, 'client', 'no_show',
          'Session missed',
          `Your therapist marked your session with ${session.therapistId?.name || 'them'} as a no-show.`,
          '/client-dashboard?tab=past'
        ).catch(() => {});
      } catch (e) { console.error('[NOSHOW MANUAL] failed:', e.message); }
    } else if (status === 'cancelled') {
      import('../utils/clientFlags.js').then(m => m.checkCancellationFlag(session.clientId._id).catch(e => console.error('[FLAG]', e)));
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
