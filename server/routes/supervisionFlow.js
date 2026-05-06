/**
 * /api/supervision-flow — new supervision flow (renamed from /api/supervision because that's
 * already used by an older simpler route). Endpoints:
 *
 *  Supervisor application (therapist-side):
 *    POST   /supervisor-apply              — therapist submits intake
 *    GET    /admin/pending-supervisors     — admin queue
 *    PUT    /supervisor/:id/decide         — admin approve/reject
 *
 *  Supervisee application (therapist-side):
 *    POST   /supervisee-apply              — therapist submits intake
 *    GET    /admin/pending-supervisees     — admin queue
 *    PUT    /supervisee/:id/decide         — admin approve/reject
 *
 *  Public listing:
 *    GET    /supervisors                   — approved supervisors with public profile
 *    GET    /groups                        — approved group supervision listings
 *    GET    /groups/:id                    — single group detail
 *
 *  Group supervision (therapist-side):
 *    POST   /groups                        — supervisor creates group; admin must approve
 *    GET    /groups/admin/pending          — admin queue
 *    PUT    /groups/:id/decide             — admin approve/reject
 *    GET    /my/groups-leading             — supervisor's own groups
 *
 *  Notes (supervisor-only):
 *    POST   /notes                         — write a supervision note
 *    GET    /my/notes                      — list notes (supervisor sees their own; supervisee sees their non-private)
 */
import express from 'express';
import Therapist from '../models/Therapist.js';
import SupervisionGroup from '../models/SupervisionGroup.js';
import SupervisionNotes from '../models/SupervisionNotes.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, therapistOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const notifyAdmins = async (type, title, body, link = '/admin-dashboard') => {
  try {
    const Admin = (await import('../models/Admin.js')).default;
    const admins = await Admin.find({}).select('_id email name');
    for (const a of admins) {
      Notification.notify(a._id, 'admin', type, title, body, link).catch(() => {});
      if (a.email) sendEmail(a.email, title, `<p>Hi ${a.name || 'Admin'},</p><p>${body}</p>`).catch(() => {});
    }
  } catch {}
};

// ============== SUPERVISOR APPLICATION ==============
router.post('/supervisor-apply', protect, therapistOnly, async (req, res) => {
  try {
    const t = await Therapist.findById(req.userId);
    if (!t) return res.status(404).json({ message: 'Therapist not found' });
    if (t.supervisorProfile?.isApplied && !t.supervisorProfile.isRejected) {
      return res.status(400).json({ message: 'You have already applied. Wait for admin review.' });
    }
    const {
      therapyExperienceYears, supervisionExperienceYears, audience, focusBio, approach,
      durationOptions, individualPrice50, individualPrice90, openTo,
    } = req.body || {};

    t.supervisorProfile = {
      ...(t.supervisorProfile?.toObject ? t.supervisorProfile.toObject() : t.supervisorProfile || {}),
      isApplied: true, isApproved: false, isRejected: false,
      appliedAt: new Date(), approvedAt: null, rejectedAt: null, rejectionReason: '',
      therapyExperienceYears: Number(therapyExperienceYears) || 0,
      supervisionExperienceYears: Number(supervisionExperienceYears) || 0,
      audience: audience || '',
      focusBio: focusBio || '',
      approach: approach || '',
      durationOptions: Array.isArray(durationOptions) ? durationOptions.map(Number).filter(n => n > 0) : [50],
      individualPrice50: Number(individualPrice50) || 0,
      individualPrice90: Number(individualPrice90) || 0,
      openTo: ['individual', 'group', 'both'].includes(openTo) ? openTo : 'individual',
    };
    await t.save();

    notifyAdmins('supervisor_application', `Supervisor application: ${t.name}`,
      `${t.name} (${t.email}) has applied to be a supervisor. Review in the admin dashboard.`,
      '/admin-dashboard?tab=pending');

    res.json({ user: t });
  } catch (e) {
    console.error('Supervisor apply error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/pending-supervisors', protect, adminOnly, async (req, res) => {
  try {
    const list = await Therapist.find({
      'supervisorProfile.isApplied': true,
      'supervisorProfile.isApproved': false,
      'supervisorProfile.isRejected': false,
    }).select('-password').sort({ 'supervisorProfile.appliedAt': -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/supervisor/:id/decide', protect, adminOnly, async (req, res) => {
  try {
    const { approve, reason } = req.body || {};
    const t = await Therapist.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Therapist not found' });

    if (approve) {
      t.supervisorProfile.isApproved = true;
      t.supervisorProfile.isRejected = false;
      t.supervisorProfile.approvedAt = new Date();
    } else {
      t.supervisorProfile.isApproved = false;
      t.supervisorProfile.isRejected = true;
      t.supervisorProfile.rejectedAt = new Date();
      t.supervisorProfile.rejectionReason = reason || '';
    }
    await t.save();

    Notification.notify(t._id, 'therapist',
      approve ? 'supervisor_approved' : 'supervisor_rejected',
      approve ? 'You\'re approved as a Supervisor on Ehsaas' : 'Supervisor application not approved',
      approve
        ? 'You can now appear in the supervisor directory and accept supervision sessions. Make sure your "supervision" service is also accepted.'
        : (reason || 'Admin did not approve your application.'),
      '/therapist-dashboard'
    ).catch(() => {});
    if (t.email) {
      sendEmail(t.email,
        approve ? 'Supervisor application approved — Ehsaas' : 'Supervisor application — update',
        `<p>Hi ${t.name},</p>${approve
          ? '<p>Welcome — you\'re now an Ehsaas Supervisor. Your supervisor profile is live in the supervisor directory.</p>'
          : `<p>Your supervisor application was not approved.${reason ? ` Reason: ${reason}` : ''}</p>`
        }`
      ).catch(() => {});
    }
    res.json(t);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ============== SUPERVISEE APPLICATION ==============
router.post('/supervisee-apply', protect, therapistOnly, async (req, res) => {
  try {
    const t = await Therapist.findById(req.userId);
    if (!t) return res.status(404).json({ message: 'Therapist not found' });
    if (t.superviseeProfile?.isApplied && !t.superviseeProfile.isRejected) {
      return res.status(400).json({ message: 'You have already applied. Wait for admin review.' });
    }
    const { experienceLevelHours, currentCaseload, goalsExpectations, modalities, consentToGuidelines } = req.body || {};
    if (!consentToGuidelines) return res.status(400).json({ message: 'Consent to supervision guidelines is required.' });

    t.superviseeProfile = {
      ...(t.superviseeProfile?.toObject ? t.superviseeProfile.toObject() : t.superviseeProfile || {}),
      isApplied: true, isApproved: false, isRejected: false,
      appliedAt: new Date(), approvedAt: null, rejectedAt: null, rejectionReason: '',
      experienceLevelHours: Number(experienceLevelHours) || 0,
      currentCaseload: Number(currentCaseload) || 0,
      goalsExpectations: goalsExpectations || '',
      modalities: modalities || '',
      consentToGuidelines: true,
    };
    await t.save();

    notifyAdmins('supervisee_application', `Supervisee application: ${t.name}`,
      `${t.name} (${t.email}) has applied for supervision. Review in the admin dashboard.`);

    res.json({ user: t });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/admin/pending-supervisees', protect, adminOnly, async (req, res) => {
  try {
    const list = await Therapist.find({
      'superviseeProfile.isApplied': true,
      'superviseeProfile.isApproved': false,
      'superviseeProfile.isRejected': false,
    }).select('-password').sort({ 'superviseeProfile.appliedAt': -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/supervisee/:id/decide', protect, adminOnly, async (req, res) => {
  try {
    const { approve, reason } = req.body || {};
    const t = await Therapist.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Therapist not found' });

    if (approve) {
      t.superviseeProfile.isApproved = true;
      t.superviseeProfile.isRejected = false;
      t.superviseeProfile.approvedAt = new Date();
    } else {
      t.superviseeProfile.isApproved = false;
      t.superviseeProfile.isRejected = true;
      t.superviseeProfile.rejectedAt = new Date();
      t.superviseeProfile.rejectionReason = reason || '';
    }
    await t.save();

    Notification.notify(t._id, 'therapist',
      approve ? 'supervisee_approved' : 'supervisee_rejected',
      approve ? 'You\'re approved for supervision' : 'Supervision application not approved',
      approve
        ? 'You can now book supervision sessions with our approved supervisors.'
        : (reason || 'Admin did not approve your application.'),
      '/therapist-dashboard'
    ).catch(() => {});
    if (t.email) {
      sendEmail(t.email,
        approve ? 'Supervision approved — Ehsaas' : 'Supervision application — update',
        `<p>Hi ${t.name},</p>${approve
          ? '<p>You\'re approved for supervision. Browse the supervisor directory to book individual or group supervision.</p>'
          : `<p>Your supervision application was not approved.${reason ? ` Reason: ${reason}` : ''}</p>`}`
      ).catch(() => {});
    }
    res.json(t);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ============== PUBLIC LISTING ==============
router.get('/supervisors', async (req, res) => {
  try {
    const list = await Therapist.find({
      isApproved: true,
      accountStatus: { $ne: 'past' },
      'supervisorProfile.isApproved': true,
      'approvedServices': { $elemMatch: { type: 'supervision', therapistAccepted: true } },
    }).select('name title image bio specializations experience supervisorProfile');

    const result = list.map(t => {
      const obj = t.toObject();
      // Strip therapist-only fields if any
      return obj;
    });
    res.json(result);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ============== GROUP SUPERVISION ==============
router.post('/groups', protect, therapistOnly, async (req, res) => {
  try {
    const t = await Therapist.findById(req.userId);
    if (!t || !t.supervisorProfile?.isApproved) return res.status(403).json({ message: 'Only approved supervisors can create group supervision.' });
    if (!['group', 'both'].includes(t.supervisorProfile?.openTo)) {
      return res.status(400).json({ message: 'Your supervisor profile is not set to offer group supervision. Update your profile first.' });
    }

    const { title, description, level, format, groupSize, schedule, sessionStartAt, totalSessions, durationMinutes, pricePer4Sessions, language, mode, coLeadTherapistId } = req.body || {};
    if (!title || !groupSize || !pricePer4Sessions) return res.status(400).json({ message: 'title, groupSize, and pricePer4Sessions are required' });

    const supervisors = [req.userId];
    if (coLeadTherapistId) {
      const co = await Therapist.findById(coLeadTherapistId);
      if (co?.supervisorProfile?.isApproved) supervisors.push(co._id);
    }

    const g = await SupervisionGroup.create({
      title: title.trim(), description: description || '',
      level: level || 'beginner', format: format || '',
      groupSize: Math.max(2, Math.min(12, Number(groupSize))),
      supervisorTherapistIds: supervisors,
      schedule: schedule || '',
      sessionStartAt: sessionStartAt ? new Date(sessionStartAt) : null,
      totalSessions: Number(totalSessions) || 4,
      durationMinutes: Number(durationMinutes) || 90,
      pricePer4Sessions: Number(pricePer4Sessions),
      language: language || 'English',
      mode: mode || 'online',
      status: 'pending_admin',
    });

    notifyAdmins('supervision_group_request', `Supervision group request: ${title}`,
      `${t.name} requested a new supervision group "${title}".`);

    res.status(201).json(g);
  } catch (e) {
    console.error('Create supervision group error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/groups', async (req, res) => {
  try {
    const list = await SupervisionGroup.find({ status: { $in: ['upcoming', 'ongoing'] } })
      .populate('supervisorTherapistIds', 'name title image bio supervisorProfile')
      .sort({ sessionStartAt: 1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/groups/:id', async (req, res) => {
  try {
    const g = await SupervisionGroup.findById(req.params.id)
      .populate('supervisorTherapistIds', 'name title image bio supervisorProfile');
    if (!g) return res.status(404).json({ message: 'Group not found' });
    res.json(g);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/groups/admin/pending', protect, adminOnly, async (req, res) => {
  try {
    const list = await SupervisionGroup.find({ status: 'pending_admin' })
      .populate('supervisorTherapistIds', 'name title image')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/groups/:id/decide', protect, adminOnly, async (req, res) => {
  try {
    const { approve, reason } = req.body || {};
    const g = await SupervisionGroup.findById(req.params.id).populate('supervisorTherapistIds', 'name email');
    if (!g) return res.status(404).json({ message: 'Group not found' });
    if (approve) {
      g.status = 'upcoming';
      g.approvedAt = new Date();
    } else {
      g.status = 'rejected';
      g.rejectedAt = new Date();
      g.rejectionReason = reason || '';
    }
    await g.save();
    for (const t of g.supervisorTherapistIds) {
      Notification.notify(t._id, 'therapist',
        approve ? 'supervision_group_approved' : 'supervision_group_rejected',
        approve ? `Supervision group approved: ${g.title}` : `Supervision group not approved: ${g.title}`,
        approve ? 'Therapists can now apply.' : (reason || 'Admin did not approve this group.'),
        '/therapist-dashboard'
      ).catch(() => {});
    }
    res.json(g);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/my/groups-leading', protect, therapistOnly, async (req, res) => {
  try {
    const list = await SupervisionGroup.find({ supervisorTherapistIds: req.userId })
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// ============== NOTES ==============
router.post('/notes', protect, therapistOnly, async (req, res) => {
  try {
    const t = await Therapist.findById(req.userId);
    if (!t?.supervisorProfile?.isApproved) return res.status(403).json({ message: 'Only approved supervisors can write supervision notes.' });
    const { sessionId, supervisionGroupId, sessionNumber, superviseeTherapistId,
      casesDiscussed, issuesDiscussed, skillsTechniques, ethics, readingsAssigned, actionPlans, privateToSupervisor } = req.body || {};
    const n = await SupervisionNotes.create({
      sessionId: sessionId || null,
      supervisionGroupId: supervisionGroupId || null,
      sessionNumber: sessionNumber || null,
      supervisorTherapistId: req.userId,
      superviseeTherapistId: superviseeTherapistId || null,
      casesDiscussed: casesDiscussed || '',
      issuesDiscussed: issuesDiscussed || '',
      skillsTechniques: skillsTechniques || '',
      ethics: ethics || '',
      readingsAssigned: readingsAssigned || '',
      actionPlans: actionPlans || '',
      privateToSupervisor: !!privateToSupervisor,
    });
    res.status(201).json(n);
  } catch (e) {
    console.error('Supervision notes error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my/notes', protect, therapistOnly, async (req, res) => {
  try {
    // Supervisor sees ALL their notes (including private). Supervisee sees non-private notes about them.
    const supervisorNotes = await SupervisionNotes.find({ supervisorTherapistId: req.userId })
      .populate('superviseeTherapistId', 'name')
      .sort({ createdAt: -1 });
    const superviseeNotes = await SupervisionNotes.find({
      superviseeTherapistId: req.userId,
      privateToSupervisor: false,
    }).populate('supervisorTherapistId', 'name').sort({ createdAt: -1 });
    res.json({ asSupervisor: supervisorNotes, asSupervisee: superviseeNotes });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
