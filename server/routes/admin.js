import express from 'express';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sendApprovalEmail, sendRejectionEmail } from '../utils/email.js';

const router = express.Router();

// Helper to convert pricing Map
const convertPricing = (therapist) => {
  const obj = therapist.toObject ? therapist.toObject() : { ...therapist };
  if (obj.pricing instanceof Map) {
    obj.pricing = Object.fromEntries(obj.pricing);
  }
  delete obj.password;
  return obj;
};

// GET /api/admin/pending-therapists
router.get('/pending-therapists', protect, adminOnly, async (req, res) => {
  try {
    const therapists = await Therapist.find({ onboardingStatus: 'pending_approval' })
      .select('-password')
      .sort({ createdAt: -1 });

    const result = therapists.map(convertPricing);
    res.json(result);
  } catch (error) {
    console.error('Get pending therapists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/all-therapists
router.get('/all-therapists', protect, adminOnly, async (req, res) => {
  try {
    const therapists = await Therapist.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    const result = therapists.map(convertPricing);
    res.json(result);
  } catch (error) {
    console.error('Get all therapists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/therapists/:id/approve
router.put('/therapists/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        onboardingStatus: 'approved',
        rejectionReason: '',
      },
      { new: true }
    ).select('-password');

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    console.log(`[ADMIN] Approved therapist: ${therapist.name} (${therapist.email})`);

    // Audit log
    try { const { logAudit } = await import('../middleware/audit.js'); logAudit(req, 'therapist_approved', 'Therapist', therapist._id, { name: therapist.name }); } catch {}

    // Send approval email (fire and forget)
    sendApprovalEmail(therapist).catch(err => console.error('[EMAIL] Approval email error:', err));

    res.json(convertPricing(therapist));
  } catch (error) {
    console.error('Approve therapist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/therapists/:id/reject
router.put('/therapists/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: false,
        onboardingStatus: 'rejected',
        rejectionReason: reason || 'Application not approved at this time.',
      },
      { new: true }
    ).select('-password');

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    console.log(`[ADMIN] Rejected therapist: ${therapist.name} (${therapist.email})`);
    try { const { logAudit } = await import('../middleware/audit.js'); logAudit(req, 'therapist_rejected', 'Therapist', therapist._id, { name: therapist.name, reason }); } catch {}

    // Send rejection email (fire and forget, reason is optional)
    sendRejectionEmail(therapist, reason || '').catch(err => console.error('[EMAIL] Rejection email error:', err));

    res.json(convertPricing(therapist));
  } catch (error) {
    console.error('Reject therapist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/therapists/:id — delete therapist profile
router.delete('/therapists/:id', protect, adminOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    // Check for active upcoming sessions
    const upcomingCount = await Session.countDocuments({
      therapistId: req.params.id,
      status: 'scheduled',
      date: { $gte: new Date() },
    });
    if (upcomingCount > 0) {
      return res.status(400).json({ message: `Cannot delete — ${upcomingCount} upcoming session(s) scheduled. Cancel or complete them first.` });
    }

    const info = { name: therapist.name, email: therapist.email };
    await Therapist.findByIdAndDelete(req.params.id);
    console.log(`[ADMIN] Deleted therapist: ${info.name} (${info.email})`);
    try { const { logAudit } = await import('../middleware/audit.js'); logAudit(req, 'therapist_deleted', 'Therapist', req.params.id, info); } catch {}
    res.json({ message: 'Therapist deleted', ...info });
  } catch (error) {
    console.error('Delete therapist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/therapists/:id/commission — set commission percent
router.put('/therapists/:id/commission', protect, adminOnly, async (req, res) => {
  try {
    const { commissionPercent } = req.body;
    const pct = Number(commissionPercent);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ message: 'commissionPercent must be between 0 and 100' });
    }
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      { commissionPercent: pct },
      { new: true }
    ).select('-password');
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    try { const { logAudit } = await import('../middleware/audit.js'); logAudit(req, 'commission_updated', 'Therapist', therapist._id, { name: therapist.name, commissionPercent: pct }); } catch {}
    res.json(convertPricing(therapist));
  } catch (error) {
    console.error('Set commission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/therapists/:id/type — set therapist type (psychologist/psychiatrist)
router.put('/therapists/:id/type', protect, adminOnly, async (req, res) => {
  try {
    const { therapistType } = req.body;
    if (!['psychologist', 'psychiatrist'].includes(therapistType)) {
      return res.status(400).json({ message: 'Invalid therapist type' });
    }
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      { therapistType },
      { new: true }
    ).select('-password');
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    res.json(convertPricing(therapist));
  } catch (error) {
    console.error('Set type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/monthly-analytics?year=2026&month=4 — monthly breakdown
// If month omitted, returns breakdown by month for the year
router.get('/monthly-analytics', protect, adminOnly, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = req.query.month !== undefined ? Number(req.query.month) : null; // 1-12

    // Helper: build date range
    const buildRange = (y, m) => {
      if (m !== null) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        return { start, end };
      }
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
    };

    // Per-month breakdown (12 months or just one month if specified)
    const months = month !== null ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
    const monthlyData = await Promise.all(months.map(async (m) => {
      const { start, end } = buildRange(year, m);
      // Sessions in this month
      const sessions = await Session.find({
        date: { $gte: start, $lt: end }
      }).populate('therapistId', 'name commissionPercent therapistType').lean();

      const total = sessions.length;
      const completed = sessions.filter(s => s.status === 'completed').length;
      const cancelled = sessions.filter(s => s.status === 'cancelled').length;
      const noShow = sessions.filter(s => s.status === 'no-show').length;

      // Revenue = sum of amounts from completed sessions
      const completedSessions = sessions.filter(s => s.status === 'completed');
      let totalRevenue = 0;
      let therapistShare = 0;
      let ehsaasShare = 0;
      const therapistBreakdown = {};

      for (const s of completedSessions) {
        const amount = s.amount || 0;
        totalRevenue += amount;
        const pct = s.therapistId?.commissionPercent ?? 60;
        const therapistCut = Math.round((amount * pct) / 100);
        const ehsaasCut = amount - therapistCut;
        therapistShare += therapistCut;
        ehsaasShare += ehsaasCut;
        if (s.therapistId) {
          const tid = String(s.therapistId._id);
          if (!therapistBreakdown[tid]) {
            therapistBreakdown[tid] = {
              therapistId: tid,
              name: s.therapistId.name,
              commissionPercent: pct,
              sessions: 0,
              revenue: 0,
              therapistShare: 0,
              ehsaasShare: 0,
            };
          }
          therapistBreakdown[tid].sessions += 1;
          therapistBreakdown[tid].revenue += amount;
          therapistBreakdown[tid].therapistShare += therapistCut;
          therapistBreakdown[tid].ehsaasShare += ehsaasCut;
        }
      }

      return {
        year,
        month: m,
        monthName: new Date(year, m - 1, 1).toLocaleString('en-US', { month: 'long' }),
        total,
        completed,
        cancelled,
        noShow,
        totalRevenue,
        therapistShare,
        ehsaasShare,
        therapists: Object.values(therapistBreakdown),
      };
    }));

    // Year totals
    const yearTotal = monthlyData.reduce((acc, m) => ({
      total: acc.total + m.total,
      completed: acc.completed + m.completed,
      cancelled: acc.cancelled + m.cancelled,
      noShow: acc.noShow + m.noShow,
      totalRevenue: acc.totalRevenue + m.totalRevenue,
      therapistShare: acc.therapistShare + m.therapistShare,
      ehsaasShare: acc.ehsaasShare + m.ehsaasShare,
    }), { total: 0, completed: 0, cancelled: 0, noShow: 0, totalRevenue: 0, therapistShare: 0, ehsaasShare: 0 });

    res.json({ year, monthly: monthlyData, yearTotal });
  } catch (error) {
    console.error('Monthly analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/all-clients
router.get('/all-clients', protect, adminOnly, async (req, res) => {
  try {
    const clients = await Client.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/all-sessions
router.get('/all-sessions', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await Session.find({})
      .populate('clientId', 'name email phone')
      .populate('therapistId', 'name title email')
      .sort({ date: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Get all sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [
      totalTherapists,
      approvedTherapists,
      pendingTherapists,
      totalClients,
      totalSessions,
      completedSessions,
    ] = await Promise.all([
      Therapist.countDocuments(),
      Therapist.countDocuments({ onboardingStatus: 'approved' }),
      Therapist.countDocuments({ onboardingStatus: 'pending_approval' }),
      Client.countDocuments(),
      Session.countDocuments(),
      Session.countDocuments({ status: 'completed' }),
    ]);

    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      totalTherapists,
      approvedTherapists,
      pendingTherapists,
      totalClients,
      totalSessions,
      completedSessions,
      totalRevenue,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/therapists/:id/details — full therapist detail with sessions
router.get('/therapists/:id/details', protect, adminOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.params.id).select('-password');
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    const sessions = await Session.find({ therapistId: req.params.id })
      .populate('clientId', 'name email phone')
      .sort({ date: -1 });

    const payments = await Payment.find({ therapistId: req.params.id, status: 'completed' });
    const totalEarnings = payments.reduce((s, p) => s + p.amount, 0);
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date());
    const totalHours = completedSessions.reduce((s, ses) => s + (ses.duration / 60), 0);

    const obj = convertPricing(therapist);
    res.json({
      ...obj,
      sessions,
      stats: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        upcomingSessions: upcomingSessions.length,
        totalEarnings,
        totalHours: Math.round(totalHours * 10) / 10,
      }
    });
  } catch (error) {
    console.error('Get therapist details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/clients/:id/details — full client detail with sessions
router.get('/clients/:id/details', protect, adminOnly, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).select('-password');
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const sessions = await Session.find({ clientId: req.params.id })
      .populate('therapistId', 'name title image')
      .sort({ date: -1 });

    const payments = await Payment.find({ clientId: req.params.id, status: 'completed' });
    const totalSpent = payments.reduce((s, p) => s + p.amount, 0);
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const upcomingSessions = sessions.filter(s => s.status === 'scheduled' && new Date(s.date) >= new Date());

    res.json({
      ...client.toObject(),
      sessions,
      stats: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        upcomingSessions: upcomingSessions.length,
        totalSpent,
      }
    });
  } catch (error) {
    console.error('Get client details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/all-reviews
router.get('/all-reviews', protect, adminOnly, async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('clientId', 'name email')
      .populate('therapistId', 'name title')
      .populate('sessionId', 'date startTime duration')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/analytics — platform-wide analytics
router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    // Monthly revenue (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format monthly revenue
    const revenueData = monthlyRevenue.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      revenue: m.revenue,
      transactions: m.count,
    }));

    // Session completion rate
    const totalSessions = await Session.countDocuments();
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const cancelledSessions = await Session.countDocuments({ status: 'cancelled' });
    const scheduledSessions = await Session.countDocuments({ status: 'scheduled' });
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Top therapists by sessions and earnings
    const topTherapists = await Session.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$therapistId',
          sessions: { $sum: 1 },
          earnings: { $sum: '$amount' },
          hours: { $sum: { $divide: ['$duration', 60] } }
        }
      },
      { $sort: { sessions: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'therapists', localField: '_id', foreignField: '_id', as: 'therapist'
        }
      },
      { $unwind: '$therapist' },
      {
        $project: {
          name: '$therapist.name',
          title: '$therapist.title',
          rating: '$therapist.rating',
          sessions: 1,
          earnings: 1,
          hours: { $round: ['$hours', 1] }
        }
      }
    ]);

    // Client growth (last 12 months)
    const clientGrowth = await Client.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const growthData = clientGrowth.map(g => ({
      month: `${g._id.year}-${String(g._id.month).padStart(2, '0')}`,
      clients: g.count,
    }));

    // Review stats
    const totalReviews = await Review.countDocuments();
    const avgRating = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    res.json({
      revenueData,
      sessionStats: { total: totalSessions, completed: completedSessions, cancelled: cancelledSessions, scheduled: scheduledSessions, completionRate },
      topTherapists,
      growthData,
      reviewStats: { total: totalReviews, avgRating: avgRating.length > 0 ? Math.round(avgRating[0].avg * 10) / 10 : 0 },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== INTERVIEWS ====================

// POST /api/admin/interviews — schedule interview with therapist
router.post('/interviews', protect, adminOnly, async (req, res) => {
  try {
    const InterviewSchedule = (await import('../models/InterviewSchedule.js')).default;
    const { therapistId, scheduledDate, scheduledTime, meetingLink, notes } = req.body;

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    const interview = await InterviewSchedule.create({
      therapistId,
      adminId: req.userId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      meetingLink,
      notes: notes || '',
    });

    // Send ICS calendar invite to both
    try {
      const { generateInterviewICS } = await import('../utils/calendar.js');
      const { sendEmail } = await import('../utils/email.js');
      const Admin = (await import('../models/Admin.js')).default;
      const admin = await Admin.findById(req.userId);

      const ics = generateInterviewICS(interview, therapist, admin);
      const html = `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Interview Scheduled 📅</h2>
          <p>Your Ehsaas onboarding interview has been scheduled.</p>
          <table style="width:100%; border-collapse:collapse; margin:15px 0;">
            <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Date</td><td style="padding:8px; border:1px solid #ddd;">${new Date(scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
            <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Time</td><td style="padding:8px; border:1px solid #ddd;">${scheduledTime}</td></tr>
            <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Meeting Link</td><td style="padding:8px; border:1px solid #ddd;"><a href="${meetingLink}">${meetingLink}</a></td></tr>
          </table>
          <p>A calendar invite is attached. Please add it to your calendar.</p>
        </div>`;
      const attachments = [{ filename: 'interview.ics', content: ics, contentType: 'text/calendar' }];

      sendEmail(therapist.email, `Ehsaas Interview Scheduled`, html, attachments).catch(() => {});
      if (admin) sendEmail(admin.email, `Interview Scheduled — ${therapist.name}`, html, attachments).catch(() => {});
    } catch (icsErr) {
      console.error('Interview ICS error:', icsErr);
    }

    res.status(201).json(interview);
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/interviews
router.get('/interviews', protect, adminOnly, async (req, res) => {
  try {
    const InterviewSchedule = (await import('../models/InterviewSchedule.js')).default;
    const interviews = await InterviewSchedule.find()
      .populate('therapistId', 'name email title')
      .populate('adminId', 'name email')
      .sort({ scheduledDate: -1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/interviews/:id
router.put('/interviews/:id', protect, adminOnly, async (req, res) => {
  try {
    const InterviewSchedule = (await import('../models/InterviewSchedule.js')).default;
    const interview = await InterviewSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!interview) return res.status(404).json({ message: 'Not found' });
    res.json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ADMIN CHAT VISIBILITY ====================

// GET /api/admin/messages/conversations — see ALL conversations on the platform
router.get('/messages/conversations', protect, adminOnly, async (req, res) => {
  try {
    const Message = (await import('../models/Message.js')).default;
    const mongoose = (await import('mongoose')).default;

    const conversations = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationKey',
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          senderId: { $first: '$senderId' },
          receiverId: { $first: '$receiverId' },
          senderRole: { $first: '$senderRole' },
          messageCount: { $sum: 1 },
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    // Resolve user names for each conversation
    const result = [];
    for (const conv of conversations) {
      const ids = conv._id.split('_');
      const users = [];

      for (const id of ids) {
        let user = await Therapist.findById(id).select('name title');
        let role = 'therapist';
        if (!user) {
          user = await Client.findById(id).select('name email');
          role = 'client';
        }
        if (user) users.push({ _id: id, name: user.name, title: user.title, role });
      }

      result.push({
        conversationKey: conv._id,
        users,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Admin conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/messages/:conversationKey — read any conversation (read-only)
router.get('/messages/:conversationKey', protect, adminOnly, async (req, res) => {
  try {
    const Message = (await import('../models/Message.js')).default;
    const messages = await Message.find({ conversationKey: req.params.conversationKey })
      .sort({ createdAt: 1 });

    // Resolve sender names
    const senderCache = {};
    const result = [];
    for (const msg of messages) {
      if (!senderCache[msg.senderId]) {
        let user = await Therapist.findById(msg.senderId).select('name');
        if (!user) user = await Client.findById(msg.senderId).select('name');
        senderCache[msg.senderId] = user?.name || 'Unknown';
      }
      result.push({
        ...msg.toObject(),
        senderName: senderCache[msg.senderId],
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== VERIFY THERAPIST ====================

router.put('/therapists/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: 'verified' },
      { new: true }
    ).select('-password');
    if (!therapist) return res.status(404).json({ message: 'Not found' });
    res.json(therapist);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== AUDIT LOGS ====================

router.get('/audit-logs', protect, adminOnly, async (req, res) => {
  try {
    const AuditLog = (await import('../models/AuditLog.js')).default;
    const { action, userId, from, to, page = 1, limit = 50 } = req.query;
    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    const total = await AuditLog.countDocuments(query);

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== CSV EXPORTS ====================

router.get('/export/:type', protect, adminOnly, async (req, res) => {
  try {
    const { generateCSV } = await import('../utils/csv.js');
    const { type } = req.params;

    let data, columns, filename;

    if (type === 'sessions') {
      data = await Session.find().populate('clientId', 'name email').populate('therapistId', 'name email').lean();
      columns = [
        { key: '_id', label: 'Session ID' },
        { key: 'clientId.name', label: 'Client' },
        { key: 'clientId.email', label: 'Client Email' },
        { key: 'therapistId.name', label: 'Therapist' },
        { key: 'date', label: 'Date' },
        { key: 'startTime', label: 'Start Time' },
        { key: 'duration', label: 'Duration (min)' },
        { key: 'amount', label: 'Amount (INR)' },
        { key: 'status', label: 'Status' },
        { key: 'sessionType', label: 'Type' },
      ];
      // Flatten nested fields
      data = data.map(d => ({
        ...d,
        'clientId.name': d.clientId?.name || '',
        'clientId.email': d.clientId?.email || '',
        'therapistId.name': d.therapistId?.name || '',
      }));
      filename = 'sessions.csv';
    } else if (type === 'payments') {
      const Payment = (await import('../models/Payment.js')).default;
      data = await Payment.find().populate('clientId', 'name email').populate('therapistId', 'name').lean();
      columns = [
        { key: '_id', label: 'Payment ID' },
        { key: 'clientId.name', label: 'Client' },
        { key: 'therapistId.name', label: 'Therapist' },
        { key: 'amount', label: 'Amount (INR)' },
        { key: 'status', label: 'Status' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'createdAt', label: 'Date' },
      ];
      data = data.map(d => ({
        ...d,
        'clientId.name': d.clientId?.name || '',
        'therapistId.name': d.therapistId?.name || '',
      }));
      filename = 'payments.csv';
    } else if (type === 'clients') {
      data = await Client.find().lean();
      columns = [
        { key: '_id', label: 'Client ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'referralCode', label: 'Referral Code' },
        { key: 'createdAt', label: 'Joined' },
      ];
      filename = 'clients.csv';
    } else if (type === 'therapists') {
      data = await Therapist.find().select('-password').lean();
      columns = [
        { key: '_id', label: 'Therapist ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'title', label: 'Title' },
        { key: 'experience', label: 'Experience (yrs)' },
        { key: 'rating', label: 'Rating' },
        { key: 'totalSessions', label: 'Total Sessions' },
        { key: 'totalEarnings', label: 'Total Earnings' },
        { key: 'verificationStatus', label: 'Verification' },
        { key: 'onboardingStatus', label: 'Onboarding Status' },
        { key: 'createdAt', label: 'Joined' },
      ];
      filename = 'therapists.csv';
    } else {
      return res.status(400).json({ message: 'Invalid export type. Use: sessions, payments, clients, therapists' });
    }

    const csv = generateCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== INVOICE ====================

router.get('/payments/:id/invoice', protect, async (req, res) => {
  try {
    const Payment = (await import('../models/Payment.js')).default;
    const { generateInvoiceHTML } = await import('../utils/invoice.js');

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Verify access
    if (req.userRole === 'client' && payment.clientId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const client = await Client.findById(payment.clientId).select('name email phone');
    const therapist = await Therapist.findById(payment.therapistId).select('name title email');
    const session = payment.sessionId ? await Session.findById(payment.sessionId) : null;

    const html = generateInvoiceHTML(payment, client, therapist, session);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== FEEDBACK SURVEYS ====================

router.get('/feedback', protect, adminOnly, async (req, res) => {
  try {
    const FeedbackSurvey = (await import('../models/FeedbackSurvey.js')).default;
    const surveys = await FeedbackSurvey.find()
      .populate('clientId', 'name email')
      .populate('therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(surveys);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
