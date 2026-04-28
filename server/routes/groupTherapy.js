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
// Body: { title, description, focus, groupType, ageMin, ageMax, pricePerMember,
//         coLeadTherapistId?, sessionStartAt, sessionEndAt, totalSessions }
router.post('/request', protect, therapistOnly, async (req, res) => {
  try {
    const {
      title, description, focus, groupType, ageMin, ageMax, pricePerMember,
      coLeadTherapistId, sessionStartAt, sessionEndAt, totalSessions, registrationOpensAt
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
      maxMembers,
      pricePerMember,
      leadTherapists,
      sessionStartAt,
      sessionEndAt: sessionEndAt || null,
      totalSessions: totalSessions || 1,
      registrationOpensAt: registrationOpensAt || new Date(),
      status: 'pending_admin',
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

    // Decide initial status: waitlist if currently full
    const enrolledNow = await GroupEnrollment.countDocuments({ groupId: group._id, status: { $in: ['approved', 'enrolled'] } });
    const isFull = enrolledNow >= group.maxMembers;

    const enroll = await GroupEnrollment.create({
      groupId: group._id,
      clientId: req.userId,
      application: application || {},
      therapistApprovals: group.leadTherapists.map(tid => ({ therapistId: tid, approved: false })),
      status: isFull ? 'waitlist' : 'pending_review',
      joinedWaitlistAt: isFull ? new Date() : null,
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
