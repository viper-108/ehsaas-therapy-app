import express from 'express';
import GroupTherapy from '../models/GroupTherapy.js';
import GroupEnrollment from '../models/GroupEnrollment.js';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Notification from '../models/Notification.js';
import ChatGroup from '../models/ChatGroup.js';
import { protect, adminOnly, therapistOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// Compute the live "ongoing | upcoming | completed" status without mutating DB
const liveStatus = (g) => {
  const now = new Date();
  if (g.status === 'rejected' || g.status === 'cancelled') return g.status;
  if (g.status === 'pending_admin') return 'pending_admin';
  // All-approved groups:
  if (g.sessionEndAt && now > new Date(g.sessionEndAt)) return 'completed';
  if (now >= new Date(g.sessionStartAt)) return 'ongoing';
  return 'upcoming';
};

// Helper — verify a therapist is approved AND accepted to provide 'group' service
const therapistOffersGroup = async (therapistId) => {
  const t = await Therapist.findById(therapistId).select('approvedServices isApproved accountStatus');
  if (!t || !t.isApproved || t.accountStatus === 'past') return false;
  return (t.approvedServices || []).some(s => s.type === 'group' && s.therapistAccepted);
};

// =============== THERAPIST CREATES GROUP REQUEST ===============
// POST /api/group-therapy/request
router.post('/request', protect, therapistOnly, async (req, res) => {
  try {
    const {
      title, description, focus, groupType, ageMin, ageMax, pricePerMember,
      coLeadTherapistId, sessionStartAt, sessionEndAt, totalSessions, registrationOpensAt,
      themes, rationale, audienceDescription, contraindications, outcomes, planProcedure,
      language, frequency, mode, durationMinutes, brochureUrl, policyText, genderPreference,
    } = req.body || {};

    if (!title || !focus || !groupType || !pricePerMember || !sessionStartAt) {
      return res.status(400).json({ message: 'title, focus, groupType, pricePerMember, sessionStartAt are required' });
    }
    if (!['open', 'closed'].includes(groupType)) {
      return res.status(400).json({ message: "groupType must be 'open' or 'closed'" });
    }

    // Verify the therapist offers + accepted 'group' service
    const owned = await therapistOffersGroup(req.userId);
    if (!owned) return res.status(403).json({ message: 'You must be approved & accepted for "group" service to create a group request.' });

    const leadTherapists = [req.userId];
    if (coLeadTherapistId) {
      const coLeadOk = await therapistOffersGroup(coLeadTherapistId);
      if (!coLeadOk) return res.status(400).json({ message: 'Co-lead therapist must also be approved for "group" service.' });
      leadTherapists.push(coLeadTherapistId);
    }

    // Capacity rule: 1 therapist => 5 max; 2 therapists => 10 max
    const maxMembers = leadTherapists.length === 1 ? 5 : 10;

    const group = await GroupTherapy.create({
      title: title.trim(),
      description: description || '',
      focus,
      groupType,
      ageMin: ageMin || 18,
      ageMax: ageMax || 65,
      genderPreference: genderPreference || 'all',
      maxMembers,
      pricePerMember,
      leadTherapists,
      sessionStartAt,
      sessionEndAt: sessionEndAt || null,
      totalSessions: totalSessions || 1,
      registrationOpensAt: registrationOpensAt || new Date(),
      status: 'pending_admin',
      // Expanded fields
      themes: Array.isArray(themes) ? themes.filter(Boolean) : (themes ? [themes] : []),
      rationale: rationale || '',
      audienceDescription: audienceDescription || '',
      contraindications: contraindications || '',
      outcomes: outcomes || '',
      planProcedure: planProcedure || '',
      language: language || 'English',
      frequency: frequency || '',
      mode: mode || 'online',
      durationMinutes: Number(durationMinutes) || 60,
      brochureUrl: brochureUrl || '',
      policyText: policyText || '',
    });

    // Notify admins
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const admins = await Admin.find({}).select('_id email name');
      const therapist = await Therapist.findById(req.userId).select('name');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'group_request',
          `New group therapy request: ${title}`,
          `${therapist?.name || 'A therapist'} requested approval to launch "${title}" (${groupType}, max ${maxMembers}, ₹${pricePerMember}/member).`,
          '/admin-dashboard?tab=pending'
        ).catch(() => {});
        if (a.email) {
          sendEmail(a.email, 'New group therapy request — Ehsaas',
            `<p>Hi ${a.name || 'Admin'},</p><p>${therapist?.name} has requested approval for a new <strong>${groupType}</strong> group therapy:</p>
            <ul><li><strong>${title}</strong></li><li>Focus: ${focus}</li><li>Capacity: ${maxMembers} members</li><li>Price: ₹${pricePerMember}/member</li><li>Starts: ${new Date(sessionStartAt).toLocaleString('en-IN')}</li></ul>
            <p>Login to the admin dashboard to approve.</p>`
          ).catch(() => {});
        }
      }
    } catch {}

    res.status(201).json(group);
  } catch (e) {
    console.error('Create group request error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ADMIN APPROVES / REJECTS GROUP ===============
// PUT /api/group-therapy/:id/admin-approve
router.put('/:id/admin-approve', protect, adminOnly, async (req, res) => {
  try {
    const group = await GroupTherapy.findById(req.params.id).populate('leadTherapists', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.status !== 'pending_admin') return res.status(400).json({ message: 'Only pending groups can be approved.' });
    group.status = 'upcoming';
    group.approvedAt = new Date();
    await group.save();

    // Notify lead therapists
    for (const t of group.leadTherapists || []) {
      Notification.notify(t._id, 'therapist', 'group_approved',
        `Your group "${group.title}" was approved`,
        `Clients can now apply. Status: upcoming. First session: ${new Date(group.sessionStartAt).toLocaleString('en-IN')}.`,
        '/therapist-dashboard'
      ).catch(() => {});
      if (t.email) {
        sendEmail(t.email, `Group approved — "${group.title}"`,
          `<p>Hi ${t.name},</p><p>Your group <strong>${group.title}</strong> has been approved by admin and is now visible to clients.</p>`
        ).catch(() => {});
      }
    }

    res.json(group);
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/group-therapy/:id/admin-reject
router.put('/:id/admin-reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const group = await GroupTherapy.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectedAt: new Date(), rejectionReason: reason || ''
    }, { new: true }).populate('leadTherapists', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    for (const t of group.leadTherapists || []) {
      Notification.notify(t._id, 'therapist', 'group_rejected',
        `Group request rejected — ${group.title}`,
        reason || 'Admin did not approve this group request.',
        '/therapist-dashboard'
      ).catch(() => {});
    }
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== PUBLIC LISTING ===============
// GET /api/group-therapy?status=upcoming|ongoing|past|all
router.get('/', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    // Only show admin-approved groups publicly
    const groups = await GroupTherapy.find({ status: { $in: ['upcoming', 'ongoing', 'completed'] } })
      .populate('leadTherapists', 'name title image')
      .sort({ sessionStartAt: 1 });

    const filtered = groups
      .map(g => ({ ...g.toObject(), liveStatus: liveStatus(g) }))
      .filter(g => {
        if (status === 'all') return true;
        if (status === 'upcoming') return g.liveStatus === 'upcoming';
        if (status === 'ongoing') return g.liveStatus === 'ongoing';
        if (status === 'past') return g.liveStatus === 'completed';
        return true;
      });

    res.json(filtered);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/group-therapy/:id  — single group detail
router.get('/:id', async (req, res) => {
  try {
    const group = await GroupTherapy.findById(req.params.id)
      .populate('leadTherapists', 'name title image bio specializations');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json({ ...group.toObject(), liveStatus: liveStatus(group) });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== CLIENT ENROLLS / APPLIES ===============
// POST /api/group-therapy/:id/enroll
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Only clients can enroll' });
    const group = await GroupTherapy.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!['upcoming', 'ongoing'].includes(group.status)) return res.status(400).json({ message: 'Group is not accepting applications.' });
    if (group.isLocked) return res.status(400).json({ message: 'Group is locked.' });

    const { application } = req.body || {};
    const existing = await GroupEnrollment.findOne({ groupId: group._id, clientId: req.userId });
    if (existing) return res.status(400).json({ message: 'You already applied to this group.' });

    // Compute flags from application + cross-checks
    const Session = (await import('../models/Session.js')).default;
    const dualRelationship = await Session.findOne({
      clientId: req.userId,
      therapistId: { $in: group.leadTherapists },
      sessionType: 'individual',
      status: { $in: ['scheduled', 'completed'] },
    });

    const flags = {
      crisisRisk: !!application?.crisisRiskNow,
      languageMismatch: application?.languageComfortable === false,
      cantCommitSchedule: application?.canCommitSchedule === false,
      notComfortableSharing: application?.comfortableSharingFocus === false,
      dualRelationship: !!dualRelationship,
      underAgeRange: application?.age && (application.age < group.ageMin || application.age > group.ageMax),
    };

    // Decide initial status: waitlist if currently full
    const enrolledNow = await GroupEnrollment.countDocuments({ groupId: group._id, status: { $in: ['approved', 'enrolled'] } });
    const isFull = enrolledNow >= group.maxMembers;

    // Auto-reject for dual relationship + crisis risk (these need admin override; rejected by default)
    let initialStatus = isFull ? 'waitlist' : 'pending_review';
    let initialReason = '';
    if (flags.dualRelationship) {
      initialStatus = 'rejected';
      initialReason = 'You are currently in individual therapy with one of the lead therapists. Due to dual-relationship guidelines, you cannot join this group. Please reach out to admin if you have questions.';
    }

    const enroll = await GroupEnrollment.create({
      groupId: group._id,
      clientId: req.userId,
      application: application || {},
      flags,
      therapistApprovals: group.leadTherapists.map(tid => ({ therapistId: tid, approved: false })),
      status: initialStatus,
      rejectionReason: initialReason,
      joinedWaitlistAt: initialStatus === 'waitlist' ? new Date() : null,
    });

    // Notify admins + lead therapists
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const admins = await Admin.find({}).select('_id');
      const client = await Client.findById(req.userId).select('name');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'group_enrollment',
          `New application: ${client?.name || 'Client'} for "${group.title}"`,
          `Status: ${enroll.status}. Approve or reject in the dashboard.`,
          '/admin-dashboard'
        ).catch(() => {});
      }
      for (const tid of group.leadTherapists) {
        Notification.notify(tid, 'therapist', 'group_enrollment',
          `New application for "${group.title}"`,
          `${client?.name || 'A client'} applied. Please review their fit for the group.`,
          '/therapist-dashboard'
        ).catch(() => {});
      }
      const c = await Client.findById(req.userId).select('email name');
      if (c?.email) {
        sendEmail(c.email, `Application received — ${group.title}`,
          `<p>Hi ${c.name},</p><p>We've received your application for <strong>${group.title}</strong>.</p>
          <p>Status: <strong>${enroll.status === 'waitlist' ? 'Waitlist (group is currently full)' : 'Pending review'}</strong>.</p>
          <p>The lead therapist(s) and admin will review your application and let you know.</p>`
        ).catch(() => {});
      }
    } catch {}

    res.status(201).json(enroll);
  } catch (e) {
    console.error('Enroll error:', e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// =============== ENROLLMENT APPROVE / REJECT (admin or lead therapist) ===============
// PUT /api/group-therapy/enrollments/:id/approve
router.put('/enrollments/:id/approve', protect, async (req, res) => {
  try {
    if (!['admin', 'therapist'].includes(req.userRole)) return res.status(403).json({ message: 'Forbidden' });
    const enroll = await GroupEnrollment.findById(req.params.id).populate('groupId');
    if (!enroll) return res.status(404).json({ message: 'Application not found' });
    const group = enroll.groupId;
    if (req.userRole === 'therapist') {
      const myApproval = enroll.therapistApprovals.find(a => String(a.therapistId) === String(req.userId));
      if (!myApproval) return res.status(403).json({ message: 'Not a lead therapist for this group' });
      myApproval.approved = true;
      myApproval.decidedAt = new Date();
    } else {
      enroll.adminApproved = true;
      enroll.adminApprovedAt = new Date();
    }
    // Advance status if all therapists + admin approved
    const allTherapistsApproved = enroll.therapistApprovals.every(a => a.approved);
    const allApproved = enroll.adminApproved && allTherapistsApproved;
    if (allApproved && enroll.status === 'pending_review') {
      // Check capacity again at the moment of full approval
      const enrolledNow = await GroupEnrollment.countDocuments({ groupId: group._id, status: { $in: ['approved', 'enrolled'] } });
      if (enrolledNow >= group.maxMembers) {
        enroll.status = 'waitlist';
        enroll.joinedWaitlistAt = new Date();
      } else {
        enroll.status = 'approved';
        await GroupTherapy.findByIdAndUpdate(group._id, { $inc: { enrolledCount: 1 } });
      }
    }
    await enroll.save();

    // Notify client
    if (enroll.status === 'approved') {
      Notification.notify(enroll.clientId, 'client', 'group_approved',
        `Approved for ${group.title}!`,
        `You've been approved to join "${group.title}". Please complete payment to confirm your spot.`,
        `/group-therapy/${group._id}`
      ).catch(() => {});
    } else if (enroll.status === 'waitlist') {
      Notification.notify(enroll.clientId, 'client', 'group_waitlist',
        `On waitlist for ${group.title}`,
        `Your application was approved but the group is currently full. We'll notify you if a spot opens.`,
        `/group-therapy/${group._id}`
      ).catch(() => {});
    }

    res.json(enroll);
  } catch (e) {
    console.error(e); res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/group-therapy/enrollments/:id/reject
router.put('/enrollments/:id/reject', protect, async (req, res) => {
  try {
    if (!['admin', 'therapist'].includes(req.userRole)) return res.status(403).json({ message: 'Forbidden' });
    const { reason, referredToGroupId } = req.body || {};
    const enroll = await GroupEnrollment.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      rejectionReason: reason || '',
      referredToGroupId: referredToGroupId || null,
    }, { new: true });
    if (!enroll) return res.status(404).json({ message: 'Application not found' });

    Notification.notify(enroll.clientId, 'client', 'group_rejected',
      `Application not accepted`,
      reason ? `Reason: ${reason}${referredToGroupId ? ' — we\'ve referred you to another group.' : ''}` : 'Your application was not accepted.',
      referredToGroupId ? `/group-therapy/${referredToGroupId}` : '/group-therapy'
    ).catch(() => {});

    res.json(enroll);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== LIST ENROLLMENTS FOR A GROUP (admin/lead therapist only) ===============
// GET /api/group-therapy/:id/enrollments
router.get('/:id/enrollments', protect, async (req, res) => {
  try {
    const group = await GroupTherapy.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isLead = group.leadTherapists.some(tid => String(tid) === String(req.userId));
    if (req.userRole !== 'admin' && !isLead) return res.status(403).json({ message: 'Forbidden' });
    const enrollments = await GroupEnrollment.find({ groupId: group._id })
      .populate('clientId', 'name email phone')
      .sort({ createdAt: 1 });
    res.json(enrollments);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/group-therapy/my/enrollments — client sees their applications
router.get('/my/enrollments', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.json([]);
    const list = await GroupEnrollment.find({ clientId: req.userId })
      .populate('groupId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== LOCK GROUP (within 48hr of start) ===============
// POST /api/group-therapy/:id/lock
router.post('/:id/lock', protect, async (req, res) => {
  try {
    const group = await GroupTherapy.findById(req.params.id).populate('leadTherapists', 'name email');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.isLocked) return res.status(400).json({ message: 'Group already locked.' });

    const isLead = group.leadTherapists.some(t => String(t._id) === String(req.userId));
    if (req.userRole !== 'admin' && !isLead) return res.status(403).json({ message: 'Forbidden' });

    // Must be within 48hr of start (or admin can lock anytime)
    const hoursToStart = (new Date(group.sessionStartAt) - Date.now()) / (1000 * 60 * 60);
    if (req.userRole !== 'admin' && hoursToStart > 48) {
      return res.status(400).json({ message: 'Group can only be locked within 48 hours of start time.' });
    }

    group.isLocked = true;
    group.lockedAt = new Date();
    group.lockedBy = req.userId;

    // Auto-create chat group with admin + lead therapists + enrolled clients
    const enrolled = await GroupEnrollment.find({ groupId: group._id, status: { $in: ['approved', 'enrolled'] } }).select('clientId');
    const Admin = (await import('../models/Admin.js')).default;
    const admins = await Admin.find({}).select('_id');

    const members = [
      ...group.leadTherapists.map(t => ({ userId: t._id, role: 'therapist' })),
      ...enrolled.map(e => ({ userId: e.clientId, role: 'client' })),
      ...admins.map(a => ({ userId: a._id, role: 'admin' })),
    ];
    const chatGroup = await ChatGroup.create({
      name: `Group: ${group.title}`,
      description: `Locked group chat for "${group.title}"`,
      ownerTherapistId: group.leadTherapists[0]?._id,
      members,
    });
    group.chatGroupId = chatGroup._id;
    await group.save();

    // Mark enrollments as 'enrolled' (locked-in)
    await GroupEnrollment.updateMany(
      { groupId: group._id, status: 'approved' },
      { status: 'enrolled' }
    );

    // Notify all members
    for (const m of members) {
      const role = m.role === 'admin' ? 'admin' : (m.role === 'therapist' ? 'therapist' : 'client');
      Notification.notify(m.userId, role, 'group_locked',
        `${group.title} is now locked`,
        `The group is locked. A chat has been created with all members. No leaves or refunds permitted now.`,
        '/messages'
      ).catch(() => {});
    }

    res.json({ ...group.toObject(), chatGroupId: chatGroup._id });
  } catch (e) {
    console.error('Lock error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== CLIENT CANCELS ENROLLMENT (auto-promote waitlist) ===============
// POST /api/group-therapy/enrollments/:id/cancel
router.post('/enrollments/:id/cancel', protect, async (req, res) => {
  try {
    const enroll = await GroupEnrollment.findById(req.params.id).populate('groupId');
    if (!enroll) return res.status(404).json({ message: 'Enrollment not found' });
    const isOwner = String(enroll.clientId) === String(req.userId);
    if (!isOwner && req.userRole !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const group = enroll.groupId;
    if (group.isLocked) return res.status(400).json({ message: 'Group is locked. No cancellations allowed.' });
    if (['cancelled', 'rejected'].includes(enroll.status)) return res.status(400).json({ message: 'Already cancelled/rejected' });

    const wasEnrolled = ['approved', 'enrolled'].includes(enroll.status);
    enroll.status = 'cancelled';
    await enroll.save();

    if (wasEnrolled) {
      await GroupTherapy.findByIdAndUpdate(group._id, { $inc: { enrolledCount: -1 } });

      // Auto-promote: find first waitlisted (oldest joinedWaitlistAt)
      const next = await GroupEnrollment.findOne({
        groupId: group._id,
        status: 'waitlist',
        adminApproved: true,
      }).sort({ joinedWaitlistAt: 1 });

      // If next has all approvals already, promote to 'approved' and bump count
      if (next) {
        const allTherapistsApproved = next.therapistApprovals.every(a => a.approved);
        if (allTherapistsApproved) {
          next.status = 'approved';
          next.promotedFromWaitlistAt = new Date();
          await next.save();
          await GroupTherapy.findByIdAndUpdate(group._id, { $inc: { enrolledCount: 1 } });

          // Notify promoted client + email
          Notification.notify(next.clientId, 'client', 'group_promoted',
            `Spot opened — you're approved for ${group.title}!`,
            `A spot just opened up in the group. Complete payment to confirm your enrollment.`,
            `/group-therapy`
          ).catch(() => {});
          try {
            const c = await Client.findById(next.clientId).select('email name');
            if (c?.email) {
              const baseUrl = process.env.CLIENT_URL || '';
              sendEmail(c.email, `Spot opened in ${group.title} — confirm now`,
                `<p>Hi ${c.name || 'there'},</p>
                <p>Great news! A spot has opened up in <strong>${group.title}</strong>. You've been promoted from the waitlist.</p>
                <p><a href="${baseUrl}/group-therapy" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Confirm & Pay</a></p>
                <p style="color:#666;font-size:13px;">Pay within 48 hours to keep your spot, otherwise the next person on the waitlist will be promoted.</p>`
              ).catch(() => {});
            }
          } catch {}
        }
      }
    }

    Notification.notify(enroll.clientId, 'client', 'group_cancelled',
      `Cancelled: ${group.title}`,
      `Your enrollment has been cancelled.`,
      '/group-therapy'
    ).catch(() => {});

    res.json(enroll);
  } catch (e) {
    console.error('Cancel enrollment error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== DROP OFF (member leaves group, partial refund) ===============
// POST /api/group-therapy/enrollments/:id/drop-off
router.post('/enrollments/:id/drop-off', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Only the client can drop off' });
    const { reason } = req.body || {};
    const enroll = await GroupEnrollment.findById(req.params.id).populate('groupId');
    if (!enroll) return res.status(404).json({ message: 'Enrollment not found' });
    if (String(enroll.clientId) !== String(req.userId)) return res.status(403).json({ message: 'Not your enrollment' });
    if (!['enrolled', 'approved'].includes(enroll.status)) return res.status(400).json({ message: 'Can only drop off if currently enrolled' });
    const group = enroll.groupId;
    // After lock, no drop-off allowed (per refund policy)
    if (group.isLocked) return res.status(400).json({ message: 'Group is locked. Drop-off not allowed once locked — no refund will be issued.' });

    // Compute partial refund for closed groups (50% of remaining sessions)
    let refundAmount = 0;
    if (group.groupType === 'closed' && enroll.paymentStatus === 'paid' && enroll.paidAmount > 0) {
      const totalSessions = group.totalSessions || 1;
      const sessionsAttended = (enroll.attendance || []).filter(a => a.attended).length;
      const remaining = Math.max(0, totalSessions - sessionsAttended);
      const perSession = enroll.paidAmount / totalSessions;
      refundAmount = Math.round(perSession * remaining * 0.5);  // 50% of remaining
      enroll.refundedAmount = refundAmount;
      enroll.paymentStatus = 'partial_refund';
    }

    enroll.status = 'dropped';
    enroll.droppedAt = new Date();
    enroll.dropReason = reason || '';
    await enroll.save();
    await GroupTherapy.findByIdAndUpdate(group._id, { $inc: { enrolledCount: -1 } });

    // Auto-promote first waitlisted with all approvals
    const next = await GroupEnrollment.findOne({
      groupId: group._id, status: 'waitlist', adminApproved: true,
    }).sort({ joinedWaitlistAt: 1 });
    if (next && next.therapistApprovals.every(a => a.approved)) {
      next.status = 'approved';
      next.promotedFromWaitlistAt = new Date();
      await next.save();
      await GroupTherapy.findByIdAndUpdate(group._id, { $inc: { enrolledCount: 1 } });
      Notification.notify(next.clientId, 'client', 'group_promoted',
        `Spot opened — you're approved for ${group.title}!`,
        `Complete payment to confirm your enrollment.`,
        '/group-therapy'
      ).catch(() => {});
    }

    // Notify client + therapists
    Notification.notify(enroll.clientId, 'client', 'group_dropped',
      `Dropped off — ${group.title}`,
      refundAmount > 0 ? `Partial refund of ₹${refundAmount} (50% of remaining sessions) will be processed.` : 'No refund issued (per policy).',
      `/group-therapy/${group._id}`
    ).catch(() => {});
    for (const tid of group.leadTherapists) {
      Notification.notify(tid, 'therapist', 'group_drop_off',
        `Member left ${group.title}`,
        `${(await Client.findById(req.userId).select('name'))?.name || 'A client'} dropped off. Drop reason: ${reason || '—'}`,
        '/therapist-dashboard?tab=group-therapy'
      ).catch(() => {});
    }

    res.json({ enrollment: enroll, refundAmount });
  } catch (e) {
    console.error('Drop-off error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ATTENDANCE ===============
// PUT /api/group-therapy/:groupId/attendance
// Body: { sessionNumber, attendance: [{ enrollmentId, attended }] }
router.put('/:groupId/attendance', protect, async (req, res) => {
  try {
    const { sessionNumber, attendance } = req.body || {};
    if (!sessionNumber || !Array.isArray(attendance)) return res.status(400).json({ message: 'sessionNumber and attendance array required' });
    const group = await GroupTherapy.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isLead = group.leadTherapists.some(tid => String(tid) === String(req.userId));
    if (req.userRole !== 'admin' && !isLead) return res.status(403).json({ message: 'Forbidden' });

    for (const a of attendance) {
      const enr = await GroupEnrollment.findById(a.enrollmentId);
      if (!enr || String(enr.groupId) !== String(group._id)) continue;
      const existing = (enr.attendance || []).find(x => x.sessionNumber === Number(sessionNumber));
      if (existing) {
        existing.attended = !!a.attended;
        existing.markedAt = new Date();
      } else {
        enr.attendance.push({ sessionNumber: Number(sessionNumber), attended: !!a.attended });
      }
      await enr.save();
    }
    res.json({ message: 'Attendance saved' });
  } catch (e) {
    console.error('Attendance error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== GROUP SESSION REPORTS (effectiveness indicators) ===============
// POST /api/group-therapy/:groupId/reports
router.post('/:groupId/reports', protect, therapistOnly, async (req, res) => {
  try {
    const group = await GroupTherapy.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isLead = group.leadTherapists.some(tid => String(tid) === String(req.userId));
    if (!isLead) return res.status(403).json({ message: 'Only lead therapists can post reports' });

    const GroupSessionReport = (await import('../models/GroupSessionReport.js')).default;
    const body = req.body || {};
    const report = await GroupSessionReport.create({
      groupId: group._id,
      authorTherapistId: req.userId,
      sessionNumber: body.sessionNumber,
      sessionDate: body.sessionDate || new Date(),
      topic: body.topic || '',
      goalForSession: body.goalForSession || '',
      goalMet: body.goalMet || '',
      interventions: body.interventions || '',
      processingNotes: body.processingNotes || '',
      groupDynamics: body.groupDynamics || '',
      notableMoments: body.notableMoments || '',
      overallMood: body.overallMood || '',
      overallParticipation: body.overallParticipation || '',
      conflictsBiasesCountertransference: body.conflictsBiasesCountertransference || '',
      crisisEvents: body.crisisEvents || '',
      memberFeedback: body.memberFeedback || '',
      selfReflection: body.selfReflection || '',
      questionsForSupervision: body.questionsForSupervision || '',
    });
    res.status(201).json(report);
  } catch (e) {
    console.error('Report create error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/group-therapy/:groupId/reports
router.get('/:groupId/reports', protect, async (req, res) => {
  try {
    const group = await GroupTherapy.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isLead = group.leadTherapists.some(tid => String(tid) === String(req.userId));
    if (req.userRole !== 'admin' && !isLead) return res.status(403).json({ message: 'Forbidden' });
    const GroupSessionReport = (await import('../models/GroupSessionReport.js')).default;
    const reports = await GroupSessionReport.find({ groupId: group._id }).sort({ sessionNumber: 1 });
    res.json(reports);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== GROUPS LED BY A SPECIFIC THERAPIST (public — for their profile page) ===============
// GET /api/group-therapy/by-therapist/:therapistId
router.get('/by-therapist/:therapistId', async (req, res) => {
  try {
    const groups = await GroupTherapy.find({
      leadTherapists: req.params.therapistId,
      status: { $in: ['upcoming', 'ongoing', 'completed'] },
    })
      .populate('leadTherapists', 'name title image')
      .sort({ sessionStartAt: -1 });
    const result = groups.map(g => ({ ...g.toObject(), liveStatus: liveStatus(g) }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ADMIN PENDING GROUPS ===============
// GET /api/group-therapy/admin/pending
router.get('/admin/pending', protect, adminOnly, async (req, res) => {
  try {
    const pending = await GroupTherapy.find({ status: 'pending_admin' })
      .populate('leadTherapists', 'name title image')
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== THERAPIST'S OWN GROUPS ===============
// GET /api/group-therapy/my/leading
router.get('/my/leading', protect, therapistOnly, async (req, res) => {
  try {
    const groups = await GroupTherapy.find({ leadTherapists: req.userId })
      .populate('leadTherapists', 'name')
      .sort({ sessionStartAt: -1 });
    res.json(groups);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
