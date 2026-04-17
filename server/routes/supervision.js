import express from 'express';
import SupervisionSession from '../models/SupervisionSession.js';
import Therapist from '../models/Therapist.js';
import { protect, therapistOnly, adminOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import { generateICS } from '../utils/calendar.js';

const router = express.Router();

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

export default router;
