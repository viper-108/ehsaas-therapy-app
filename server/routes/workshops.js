import express from 'express';
import Workshop from '../models/Workshop.js';
import WorkshopRegistration from '../models/WorkshopRegistration.js';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, therapistOnly, clientOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const liveStatus = (w) => {
  if (['rejected', 'cancelled', 'pending_admin'].includes(w.status)) return w.status;
  const now = new Date();
  const dates = (w.sessionDates || []).map(d => new Date(d).getTime());
  if (dates.length === 0) return w.status;
  const last = Math.max(...dates);
  const first = Math.min(...dates);
  if (now.getTime() > last + (w.durationMinutes || 90) * 60000) return 'completed';
  if (now.getTime() >= first) return 'ongoing';
  return 'upcoming';
};

// =============== THERAPIST CREATES WORKSHOP REQUEST ===============
router.post('/request', protect, therapistOnly, async (req, res) => {
  try {
    const {
      title, description, topic, subtopics, sessionDates, durationMinutes,
      learningOutcomes, targetAudience, contraindications, planProcedure,
      coFacilitatorIds, mode, language, pricePerParticipant, capacity,
      certificateProvided, brochureUrl,
    } = req.body || {};

    if (!title || !topic || !pricePerParticipant || !Array.isArray(sessionDates) || sessionDates.length === 0) {
      return res.status(400).json({ message: 'title, topic, pricePerParticipant, and at least one sessionDate are required' });
    }

    const facilitators = [req.userId];
    if (Array.isArray(coFacilitatorIds)) {
      for (const cid of coFacilitatorIds) {
        if (cid && String(cid) !== String(req.userId)) facilitators.push(cid);
      }
    }

    const workshop = await Workshop.create({
      title: title.trim(),
      description: description || '',
      topic: topic.trim(),
      subtopics: Array.isArray(subtopics) ? subtopics.filter(Boolean) : [],
      sessionDates: sessionDates.map(d => new Date(d)),
      durationMinutes: Number(durationMinutes) || 90,
      learningOutcomes: Array.isArray(learningOutcomes) ? learningOutcomes.filter(Boolean) : [],
      targetAudience: targetAudience || '',
      contraindications: contraindications || '',
      planProcedure: planProcedure || '',
      facilitatorTherapistIds: facilitators,
      mode: mode || 'online',
      language: language || 'English',
      pricePerParticipant: Number(pricePerParticipant),
      capacity: capacity ? Number(capacity) : null,
      certificateProvided: certificateProvided !== false,
      brochureUrl: brochureUrl || '',
      status: 'pending_admin',
    });

    // Notify admins
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const admins = await Admin.find({}).select('_id name email');
      const therapist = await Therapist.findById(req.userId).select('name');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'workshop_request',
          `New workshop request: ${title}`,
          `${therapist?.name || 'A therapist'} requested approval for the workshop "${title}".`,
          '/admin-dashboard?tab=pending'
        ).catch(() => {});
        if (a.email) {
          sendEmail(a.email, 'New workshop request — Ehsaas',
            `<p>Hi ${a.name || 'Admin'},</p><p><strong>${therapist?.name}</strong> has requested approval for a new workshop:</p>
            <ul><li><strong>${title}</strong></li><li>Topic: ${topic}</li><li>Sessions: ${sessionDates.length}</li><li>Price: ₹${pricePerParticipant}/participant</li></ul>
            <p>Login to admin dashboard to approve.</p>`
          ).catch(() => {});
        }
      }
    } catch {}

    res.status(201).json(workshop);
  } catch (e) {
    console.error('Create workshop error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ADMIN APPROVE / REJECT ===============
router.put('/:id/admin-approve', protect, adminOnly, async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id).populate('facilitatorTherapistIds', 'name email');
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    if (w.status !== 'pending_admin') return res.status(400).json({ message: 'Only pending workshops can be approved' });
    w.status = 'upcoming';
    w.approvedAt = new Date();
    await w.save();

    for (const t of w.facilitatorTherapistIds || []) {
      Notification.notify(t._id, 'therapist', 'workshop_approved',
        `Your workshop "${w.title}" was approved`,
        `Clients can now register. First session: ${new Date(w.sessionDates[0]).toLocaleString('en-IN')}.`,
        '/therapist-dashboard'
      ).catch(() => {});
      if (t.email) {
        sendEmail(t.email, `Workshop approved — ${w.title}`,
          `<p>Hi ${t.name},</p><p>Your workshop <strong>${w.title}</strong> has been approved by admin and is now visible to clients.</p>`
        ).catch(() => {});
      }
    }
    res.json(w);
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/admin-reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const w = await Workshop.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectedAt: new Date(), rejectionReason: reason || ''
    }, { new: true }).populate('facilitatorTherapistIds', 'name email');
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    for (const t of w.facilitatorTherapistIds || []) {
      Notification.notify(t._id, 'therapist', 'workshop_rejected',
        `Workshop request rejected — ${w.title}`,
        reason || 'Admin did not approve this workshop request.',
        '/therapist-dashboard'
      ).catch(() => {});
    }
    res.json(w);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== PUBLIC LISTING ===============
// GET /api/workshops?status=upcoming|ongoing|past|all
router.get('/', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const list = await Workshop.find({ status: { $in: ['upcoming', 'ongoing', 'completed'] } })
      .populate('facilitatorTherapistIds', 'name title image')
      .sort({ 'sessionDates.0': 1 });
    const enriched = list.map(w => ({ ...w.toObject(), liveStatus: liveStatus(w) }));
    const filtered = status === 'all' ? enriched : enriched.filter(w => {
      if (status === 'upcoming') return w.liveStatus === 'upcoming';
      if (status === 'ongoing') return w.liveStatus === 'ongoing';
      if (status === 'past') return w.liveStatus === 'completed';
      return true;
    });
    res.json(filtered);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id)
      .populate('facilitatorTherapistIds', 'name title image bio specializations');
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    res.json({ ...w.toObject(), liveStatus: liveStatus(w) });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ADMIN PENDING ===============
router.get('/admin/pending', protect, adminOnly, async (req, res) => {
  try {
    const list = await Workshop.find({ status: 'pending_admin' })
      .populate('facilitatorTherapistIds', 'name title image')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== THERAPIST'S OWN WORKSHOPS ===============
router.get('/my/facilitating', protect, therapistOnly, async (req, res) => {
  try {
    const list = await Workshop.find({ facilitatorTherapistIds: req.userId })
      .populate('facilitatorTherapistIds', 'name')
      .sort({ 'sessionDates.0': -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== CLIENT REGISTERS ===============
router.post('/:id/register', protect, clientOnly, async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id);
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    if (!['upcoming', 'ongoing'].includes(w.status)) return res.status(400).json({ message: 'Workshop is not accepting registrations.' });

    if (w.capacity && w.registeredCount >= w.capacity) {
      return res.status(400).json({ message: 'Workshop is at capacity.' });
    }

    const existing = await WorkshopRegistration.findOne({ workshopId: w._id, clientId: req.userId });
    if (existing) return res.status(400).json({ message: 'You are already registered for this workshop.' });

    const reg = await WorkshopRegistration.create({
      workshopId: w._id,
      clientId: req.userId,
    });
    await Workshop.findByIdAndUpdate(w._id, { $inc: { registeredCount: 1 } });

    const client = await Client.findById(req.userId).select('name email');
    Notification.notify(req.userId, 'client', 'workshop_registered',
      `Registered for ${w.title}`,
      `Complete payment to confirm your spot. We'll send you the joining link before the first session.`,
      `/workshops/${w._id}`
    ).catch(() => {});
    if (client?.email) {
      sendEmail(client.email, `Registered: ${w.title}`,
        `<p>Hi ${client.name},</p><p>You're registered for <strong>${w.title}</strong>. Please complete payment to confirm your spot.</p>`
      ).catch(() => {});
    }

    res.status(201).json(reg);
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== CLIENT'S REGISTRATIONS ===============
router.get('/my/registrations', protect, clientOnly, async (req, res) => {
  try {
    const list = await WorkshopRegistration.find({ clientId: req.userId })
      .populate('workshopId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== CLIENT POST-WORKSHOP FEEDBACK + CERTIFICATE ===============
router.post('/registrations/:id/feedback', protect, clientOnly, async (req, res) => {
  try {
    const reg = await WorkshopRegistration.findById(req.params.id).populate('workshopId');
    if (!reg) return res.status(404).json({ message: 'Registration not found' });
    if (String(reg.clientId) !== String(req.userId)) return res.status(403).json({ message: 'Not your registration' });
    if (!['completed', 'ongoing'].includes(liveStatus(reg.workshopId))) return res.status(400).json({ message: 'Feedback only after the workshop' });

    const { rating, learnings, suggestions, wouldRecommend } = req.body || {};
    reg.feedback = {
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      learnings: learnings || '',
      suggestions: suggestions || '',
      wouldRecommend: !!wouldRecommend,
      submittedAt: new Date(),
    };

    // Auto-issue certificate if attended + feedback submitted + workshop has certificateProvided
    if (reg.attended && reg.workshopId.certificateProvided && !reg.certificateIssuedAt) {
      reg.certificateIssuedAt = new Date();
      reg.certificateNumber = `EHS-WS-${reg._id.toString().slice(-6).toUpperCase()}`;
    }
    await reg.save();

    Notification.notify(reg.clientId, 'client', 'workshop_feedback',
      reg.certificateIssuedAt ? 'Certificate issued!' : 'Thanks for your feedback',
      reg.certificateIssuedAt ? `Your certificate for "${reg.workshopId.title}" is ready in your dashboard.` : 'Your feedback helps facilitators improve their workshops.',
      '/client-dashboard'
    ).catch(() => {});

    res.json(reg);
  } catch (e) {
    console.error('Feedback error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ATTENDANCE & SESSION SUMMARY (therapist only) ===============
// PUT /api/workshops/:id/attendance
// Body: { registrations: [{ id, attended }] }
router.put('/:id/attendance', protect, therapistOnly, async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id);
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    if (!w.facilitatorTherapistIds.some(id => String(id) === String(req.userId))) {
      return res.status(403).json({ message: 'Only facilitators can mark attendance' });
    }
    const { registrations } = req.body || {};
    if (!Array.isArray(registrations)) return res.status(400).json({ message: 'registrations array required' });
    for (const r of registrations) {
      await WorkshopRegistration.findByIdAndUpdate(r.id, { attended: !!r.attended });
    }
    res.json({ message: 'Attendance saved' });
  } catch (e) {
    console.error('Workshop attendance error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/workshops/:id/session-summary
router.put('/:id/session-summary', protect, therapistOnly, async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id);
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    if (!w.facilitatorTherapistIds.some(id => String(id) === String(req.userId))) {
      return res.status(403).json({ message: 'Only facilitators can submit summary' });
    }
    const summary = req.body || {};
    w.sessionSummary = {
      attendanceCount: Number(summary.attendanceCount) || 0,
      topicsCovered: summary.topicsCovered || '',
      keyTakeaways: summary.keyTakeaways || '',
      activitiesConducted: summary.activitiesConducted || '',
      participantEngagement: ['high', 'medium', 'low', ''].includes(summary.participantEngagement) ? summary.participantEngagement : '',
      whatToImprove: summary.whatToImprove || '',
      learningOutcomesAchieved: summary.learningOutcomesAchieved || '',
      submittedAt: new Date(),
    };
    await w.save();
    res.json(w);
  } catch (e) {
    console.error('Session summary error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== REGISTRATIONS LIST (therapist/admin) ===============
router.get('/:id/registrations', protect, async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id);
    if (!w) return res.status(404).json({ message: 'Workshop not found' });
    const isFacilitator = w.facilitatorTherapistIds.some(id => String(id) === String(req.userId));
    if (req.userRole !== 'admin' && !isFacilitator) return res.status(403).json({ message: 'Forbidden' });
    const list = await WorkshopRegistration.find({ workshopId: w._id })
      .populate('clientId', 'name email phone')
      .sort({ createdAt: 1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
