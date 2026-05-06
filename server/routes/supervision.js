import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import SupervisionSession from '../models/SupervisionSession.js';
import Therapist from '../models/Therapist.js';
import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import { protect, therapistOnly, adminOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { generateICS } from '../utils/calendar.js';

const router = express.Router();

// PhonePe creds (mirrors payments.js so the supervision flow can also use the gateway)
const PHONEPE_HOST = process.env.PHONEPE_HOST || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT86';
const SALT_KEY = process.env.PHONEPE_SALT_KEY || '96434309-7796-489d-8924-ab56988a6076';
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const generateChecksum = (payload, endpoint) => {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const string = base64Payload + endpoint + SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  return { base64Payload, checksum: sha256 + '###' + SALT_INDEX };
};

const calcEndTime = (startTime, duration) => {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// POST /api/supervision — therapist creates request
router.post('/', protect, therapistOnly, async (req, res) => {
  try {
    const { type, supervisorId, participantIds, topic, preferredDate, preferredTime } = req.body;

    if (!type || !topic) return res.status(400).json({ message: 'Type and topic are required' });

    const data = {
      type,
      requesterId: req.userId,
      topic,
      date: preferredDate ? new Date(preferredDate) : undefined,
      startTime: preferredTime || undefined,
    };

    if (type === 'individual') {
      if (!supervisorId) return res.status(400).json({ message: 'Supervisor is required for individual supervision' });
      data.supervisorId = supervisorId;
    } else if (type === 'group') {
      if (!participantIds || !participantIds.length) return res.status(400).json({ message: 'Participants are required for group supervision' });
      data.participants = participantIds.map(id => ({ therapistId: id, status: 'pending' }));
    }

    const session = await SupervisionSession.create(data);

    // Notify admin for approval
    const requester = await Therapist.findById(req.userId);
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    for (const email of adminEmails) {
      const html = `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">New Supervision Request</h2>
          <p><strong>${requester.name}</strong> has requested ${type} supervision.</p>
          <p><strong>Topic:</strong> ${topic}</p>
          <p>Please log in to the admin dashboard to approve or reject.</p>
        </div>`;
      sendEmail(email.trim(), `Supervision Request — ${requester.name}`, html).catch(() => {});
    }

    res.status(201).json(session);
  } catch (error) {
    console.error('Create supervision error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/supervision/my — therapist's supervision sessions
router.get('/my', protect, therapistOnly, async (req, res) => {
  try {
    const sessions = await SupervisionSession.find({
      $or: [
        { requesterId: req.userId },
        { supervisorId: req.userId },
        { 'participants.therapistId': req.userId },
      ]
    })
      .populate('requesterId', 'name title')
      .populate('supervisorId', 'name title')
      .populate('participants.therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/supervision/all — admin sees all
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await SupervisionSession.find()
      .populate('requesterId', 'name title email')
      .populate('supervisorId', 'name title email')
      .populate('participants.therapistId', 'name title email')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/supervision/:id/approve — admin approves
router.put('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const session = await SupervisionSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Not found' });

    session.adminApproved = true;
    session.status = 'admin_approved';
    await session.save();

    // Notify requester
    const requester = await Therapist.findById(session.requesterId);
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">Supervision Approved! ✅</h2>
        <p>Your ${session.type} supervision request on "<strong>${session.topic}</strong>" has been approved by the admin.</p>
        ${session.date ? `<p>Date: ${new Date(session.date).toLocaleDateString('en-IN')}</p>` : ''}
        <p>You will be notified once it's scheduled with a meeting link.</p>
      </div>`;
    sendEmail(requester.email, `Supervision Approved — ${session.topic}`, html).catch(() => {});

    // For individual, notify supervisor too
    if (session.type === 'individual' && session.supervisorId) {
      const supervisor = await Therapist.findById(session.supervisorId);
      if (supervisor) {
        const sHtml = `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Supervision Session Invitation</h2>
            <p><strong>${requester.name}</strong> has requested individual supervision with you on "<strong>${session.topic}</strong>". This has been approved by admin.</p>
            <p>You will be contacted with scheduling details.</p>
          </div>`;
        sendEmail(supervisor.email, `Supervision Invitation — ${session.topic}`, sHtml).catch(() => {});
      }
    }

    // For group, notify all participants
    if (session.type === 'group') {
      for (const p of session.participants) {
        const therapist = await Therapist.findById(p.therapistId);
        if (therapist) {
          const pHtml = `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Group Supervision Invitation</h2>
              <p>You've been invited to a group supervision session on "<strong>${session.topic}</strong>" organized by ${requester.name}.</p>
              <p>This has been approved by admin. Please log in to accept or decline.</p>
            </div>`;
          sendEmail(therapist.email, `Group Supervision Invitation — ${session.topic}`, pHtml).catch(() => {});
        }
      }
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/supervision/:id/reject — admin rejects
router.put('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    const session = await SupervisionSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Not found' });

    session.status = 'rejected';
    session.adminNotes = notes || '';
    await session.save();

    const requester = await Therapist.findById(session.requesterId);
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Supervision Request Declined</h2>
        <p>Your supervision request on "<strong>${session.topic}</strong>" was not approved at this time.</p>
        ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
        <p>You can submit a new request or contact the admin for more details.</p>
      </div>`;
    sendEmail(requester.email, `Supervision Update — ${session.topic}`, html).catch(() => {});

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/supervision/:id/schedule — admin schedules (sets date/time/link, sends ICS)
router.put('/:id/schedule', protect, adminOnly, async (req, res) => {
  try {
    const { date, startTime, endTime, meetingLink } = req.body;
    const session = await SupervisionSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Not found' });

    session.date = new Date(date);
    session.startTime = startTime;
    session.endTime = endTime || (() => { const [h] = startTime.split(':'); return `${String(Number(h)+1).padStart(2,'0')}:00`; })();
    session.meetingLink = meetingLink;
    session.status = 'scheduled';
    await session.save();

    // Send ICS to all involved therapists
    const attendees = [];
    const requester = await Therapist.findById(session.requesterId);
    if (requester) attendees.push({ name: requester.name, email: requester.email });

    if (session.type === 'individual' && session.supervisorId) {
      const sup = await Therapist.findById(session.supervisorId);
      if (sup) attendees.push({ name: sup.name, email: sup.email });
    }
    if (session.type === 'group') {
      for (const p of session.participants) {
        const t = await Therapist.findById(p.therapistId);
        if (t) attendees.push({ name: t.name, email: t.email });
      }
    }

    const ics = generateICS({
      title: `Supervision: ${session.topic}`,
      description: `${session.type === 'individual' ? 'Individual' : 'Group'} Supervision\nTopic: ${session.topic}\nMeeting Link: ${meetingLink}`,
      startDate: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      organizerEmail: 'sessions.ehsaas@gmail.com',
      attendees,
    });

    for (const a of attendees) {
      const html = `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Supervision Scheduled 📅</h2>
          <p><strong>${session.topic}</strong> — ${session.type} supervision</p>
          <p><strong>Date:</strong> ${new Date(session.date).toLocaleDateString('en-IN')}</p>
          <p><strong>Time:</strong> ${session.startTime} - ${session.endTime}</p>
          <p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>
          <p>A calendar invite is attached.</p>
        </div>`;
      sendEmail(a.email, `Supervision Scheduled — ${session.topic}`, html, [
        { filename: 'supervision.ics', content: ics, contentType: 'text/calendar' }
      ]).catch(() => {});
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/supervision/:id/join — therapist accepts group invitation
router.put('/:id/join', protect, therapistOnly, async (req, res) => {
  try {
    const session = await SupervisionSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Not found' });
    if (session.type !== 'group') return res.status(400).json({ message: 'Not a group supervision' });

    const participant = session.participants.find(p => p.therapistId.toString() === req.userId);
    if (!participant) return res.status(403).json({ message: 'You are not invited to this session' });

    participant.status = req.body.accept ? 'accepted' : 'declined';
    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================================================================
// INDIVIDUAL SUPERVISION — pay-up-front booking flow (therapist supervisee →
// approved supervisor). No admin approval per session: both parties are
// already admin-approved, so the session is confirmed by payment alone.
// ===========================================================================

// GET /api/supervision/availability/:supervisorId?date=YYYY-MM-DD
// Returns hourly slots available on the supervisor's calendar (considers
// both client therapy bookings and other supervision bookings).
router.get('/availability/:supervisorId', protect, therapistOnly, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date is required' });

    const supervisor = await Therapist.findById(req.params.supervisorId);
    if (!supervisor) return res.status(404).json({ message: 'Supervisor not found' });
    if (!supervisor.supervisorProfile?.isApproved) {
      return res.status(400).json({ message: 'This therapist is not an approved supervisor.' });
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    const dayAvailability = (supervisor.availability || []).find(a => a.dayOfWeek === dayOfWeek && a.isAvailable);
    if (!dayAvailability) return res.json({ slots: [], message: 'Supervisor not available on this day' });

    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);

    const [bookedTherapy, bookedSupervision] = await Promise.all([
      Session.find({ therapistId: supervisor._id, date: { $gte: startOfDay, $lte: endOfDay }, status: 'scheduled' }).select('startTime'),
      SupervisionSession.find({
        supervisorId: supervisor._id,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending_payment', 'scheduled', 'admin_approved'] },
      }).select('startTime'),
    ]);
    const bookedTimes = new Set([
      ...bookedTherapy.map(s => s.startTime),
      ...bookedSupervision.map(s => s.startTime),
    ]);

    const ranges = (Array.isArray(dayAvailability.chunks) && dayAvailability.chunks.length > 0)
      ? dayAvailability.chunks
      : [{ startTime: dayAvailability.startTime || '09:00', endTime: dayAvailability.endTime || '18:00' }];

    const slots = [];
    const seen = new Set();
    for (const range of ranges) {
      const sH = parseInt(String(range.startTime).split(':')[0]);
      const eH = parseInt(String(range.endTime).split(':')[0]);
      if (!Number.isFinite(sH) || !Number.isFinite(eH) || sH >= eH) continue;
      for (let hour = sH; hour < eH; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        if (seen.has(timeStr) || bookedTimes.has(timeStr)) continue;
        seen.add(timeStr);
        slots.push({ time: timeStr, available: true });
      }
    }
    slots.sort((a, b) => a.time.localeCompare(b.time));
    res.json({ slots });
  } catch (e) {
    console.error('Supervision slots error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/supervision/book-individual
// Body: { supervisorId, date, startTime, duration (50|90), topic }
// Creates a SupervisionSession with status='pending_payment' AND a Payment
// record, then kicks off PhonePe checkout. Once payment confirms, the
// confirm endpoint promotes the session to 'scheduled' and emails ICS.
router.post('/book-individual', protect, therapistOnly, async (req, res) => {
  try {
    const { supervisorId, date, startTime, duration, topic } = req.body || {};
    if (!supervisorId || !date || !startTime || !duration || !topic) {
      return res.status(400).json({ message: 'supervisorId, date, startTime, duration and topic are required' });
    }
    if (![50, 90].includes(Number(duration))) {
      return res.status(400).json({ message: 'duration must be 50 or 90 minutes' });
    }

    // Supervisee must be admin-approved
    const supervisee = await Therapist.findById(req.userId);
    if (!supervisee?.superviseeProfile?.isApproved) {
      return res.status(403).json({ message: 'You must be admin-approved as a supervisee to book supervision sessions.' });
    }

    // Supervisor must be admin-approved
    const supervisor = await Therapist.findById(supervisorId);
    if (!supervisor?.supervisorProfile?.isApproved) {
      return res.status(400).json({ message: 'This therapist is not an approved supervisor.' });
    }
    const supervisionAccepted = (supervisor.approvedServices || []).some(s => s.type === 'supervision' && s.therapistAccepted);
    if (!supervisionAccepted) {
      return res.status(400).json({ message: 'This supervisor is not currently accepting supervision bookings.' });
    }

    // Pricing
    const priceField = `individualPrice${Number(duration)}`;
    const amount = Number(supervisor.supervisorProfile?.[priceField] || 0);
    if (amount <= 0) {
      return res.status(400).json({ message: `This supervisor does not offer ${duration}-minute sessions.` });
    }

    // Slot conflict check
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    const conflictTherapy = await Session.findOne({ therapistId: supervisorId, date: { $gte: startOfDay, $lte: endOfDay }, startTime, status: 'scheduled' });
    const conflictSupervision = await SupervisionSession.findOne({
      supervisorId, date: { $gte: startOfDay, $lte: endOfDay }, startTime,
      status: { $in: ['pending_payment', 'scheduled', 'admin_approved'] },
    });
    if (conflictTherapy || conflictSupervision) {
      return res.status(409).json({ message: 'That slot is already booked. Please pick another time.' });
    }

    const endTime = calcEndTime(startTime, Number(duration));

    // Create the supervision session in pending_payment state
    const session = await SupervisionSession.create({
      type: 'individual',
      requesterId: req.userId,
      supervisorId,
      date: new Date(date),
      startTime, endTime,
      duration: Number(duration),
      amount,
      topic,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
    });

    // Payment record (clientId is reused as the buyer's user id, mirroring
    // the same convention training-checkout already follows).
    const merchantTransactionId = 'EHSAAS_SUP_' + uuidv4().replace(/-/g, '').substring(0, 18);
    const payment = await Payment.create({
      clientId: req.userId,                   // buyer = supervisee therapist
      therapistId: supervisorId,              // payee = supervisor
      supervisionSessionId: session._id,
      amount,
      status: 'pending',
      paymentMethod: 'phonepe',
      stripePaymentIntentId: merchantTransactionId,
    });

    // Kick off PhonePe checkout
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: 'MUID_' + req.userId.toString().substring(0, 20),
      amount: amount * 100,
      redirectUrl: `${process.env.CLIENT_URL}/payment-success?transactionId=${merchantTransactionId}&paymentId=${payment._id}&type=supervision`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.CLIENT_URL}/api/payments/callback`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };
    const endpoint = '/pg/v1/pay';
    const { base64Payload, checksum } = generateChecksum(payload, endpoint);
    const response = await axios.post(`${PHONEPE_HOST}${endpoint}`, { request: base64Payload },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum } });

    if (response.data.success && response.data.data?.instrumentResponse?.redirectInfo?.url) {
      payment.stripeSessionId = merchantTransactionId;
      await payment.save();
      session.paymentId = payment._id;
      await session.save();
      return res.json({
        url: response.data.data.instrumentResponse.redirectInfo.url,
        merchantTransactionId,
        paymentId: payment._id,
        supervisionSessionId: session._id,
        amount,
      });
    }

    // PhonePe rejected — clean up the placeholder records so the slot reopens
    await SupervisionSession.findByIdAndDelete(session._id).catch(() => {});
    await Payment.findByIdAndDelete(payment._id).catch(() => {});
    return res.status(400).json({ message: 'Could not start payment. Please try again.', details: response.data.message });
  } catch (e) {
    console.error('Book individual supervision error:', e.response?.data || e.message);
    res.status(500).json({ message: 'Server error', error: e.response?.data?.message || e.message });
  }
});

export default router;
