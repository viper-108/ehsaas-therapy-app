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
    const { specialization, language, search, service } = req.query;
    // Only show active (not soft-deleted) therapists to public
    let query = { isApproved: true, accountStatus: { $ne: 'past' } };

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
    // Filter by service type — therapist must have admin-approved AND therapist-accepted that service
    if (service && ['individual', 'couple', 'group', 'family', 'supervision'].includes(service)) {
      query.approvedServices = { $elemMatch: { type: service, therapistAccepted: true } };
    }

    const therapists = await Therapist.find(query).select('-password');

    // Compute today's booked count for each therapist to flag isFullToday
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const therapistIds = therapists.map(t => t._id);
    const bookedAgg = await Session.aggregate([
      {
        $match: {
          therapistId: { $in: therapistIds },
          date: { $gte: todayStart, $lte: todayEnd },
          status: { $in: ['scheduled', 'completed'] }
        }
      },
      { $group: { _id: '$therapistId', count: { $sum: 1 } } }
    ]);
    const bookedMap = new Map(bookedAgg.map(b => [String(b._id), b.count]));

    // Convert pricing Map to plain objects + add isFullToday flag
    // Strip pricingMin + servicesOffered (admin-only/therapist-only) from public listing
    const result = therapists.map(t => {
      const obj = t.toObject();
      if (obj.pricing instanceof Map) {
        obj.pricing = Object.fromEntries(obj.pricing);
      }
      delete obj.pricingMin; // never expose minimum to public/clients
      delete obj.servicesOffered; // never expose original therapist asks
      // Public listing: only include services therapist has accepted (the source of truth)
      if (Array.isArray(obj.approvedServices)) {
        obj.approvedServices = obj.approvedServices
          .filter(s => s.therapistAccepted)
          .map(s => ({ type: s.type, minPrice: s.minPrice, maxPrice: s.maxPrice }));
      }
      // slidingScaleAvailable IS exposed (clients should know they can request lower price)
      const todayBooked = bookedMap.get(String(t._id)) || 0;
      const maxPerDay = obj.maxSessionsPerDay || 8;
      obj.todayBookedCount = todayBooked;
      obj.isFullToday = todayBooked >= maxPerDay;
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
    // Hide soft-deleted therapists from public (unless admin call)
    if (therapist.accountStatus === 'past') {
      return res.status(404).json({ message: 'Therapist not found' });
    }
    const obj = therapist.toObject();
    if (obj.pricing instanceof Map) {
      obj.pricing = Object.fromEntries(obj.pricing);
    }
    delete obj.pricingMin; // admin-only, never expose to public
    delete obj.servicesOffered; // never expose original asks
    if (Array.isArray(obj.approvedServices)) {
      obj.approvedServices = obj.approvedServices
        .filter(s => s.therapistAccepted)
        .map(s => ({ type: s.type, minPrice: s.minPrice, maxPrice: s.maxPrice }));
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

    // Check max sessions per day — per-day override takes precedence
    const dayLimit = (dayAvailability.maxSessionsThisDay != null && dayAvailability.maxSessionsThisDay > 0)
      ? dayAvailability.maxSessionsThisDay
      : (therapist.maxSessionsPerDay || 8);
    if (bookedSessions.length >= dayLimit) {
      return res.json({ slots: [], message: 'All sessions are booked for this day', fullyBooked: true });
    }

    // Generate available slots (hourly) — iterate across all configured chunks for this day.
    // If `chunks` is non-empty, use it; otherwise fall back to the legacy single startTime–endTime range.
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
        if (seen.has(timeStr) || bookedTimes.includes(timeStr)) continue;
        seen.add(timeStr);
        slots.push({ time: timeStr, available: true });
      }
    }
    slots.sort((a, b) => a.time.localeCompare(b.time));

    res.json({ slots, maxPerDay: dayLimit, bookedCount: bookedSessions.length });
  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SERVICES OFFERED & ACCEPT/REJECT ====================

// PUT /api/therapists/dashboard/services-offered
// Body: { services: [{ type, minPrice, maxPrice }] } — therapist sets their original asks
router.put('/dashboard/services-offered', protect, therapistOnly, async (req, res) => {
  try {
    const { services } = req.body || {};
    if (!Array.isArray(services)) return res.status(400).json({ message: 'services array required' });
    const validTypes = ['individual', 'couple', 'group', 'family', 'supervision'];
    const cleaned = services
      .filter(s => s && validTypes.includes(s.type))
      .map(s => ({
        type: s.type,
        minPrice: Math.max(0, Number(s.minPrice) || 0),
        maxPrice: Math.max(0, Number(s.maxPrice) || 0),
      }))
      .filter(s => s.maxPrice > 0 && s.minPrice <= s.maxPrice);

    const therapist = await Therapist.findByIdAndUpdate(
      req.userId,
      { servicesOffered: cleaned },
      { new: true }
    ).select('-password');
    res.json(therapist);
  } catch (error) {
    console.error('Set services-offered error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/therapists/dashboard/services/:type/accept — accept admin's price for a service
router.post('/dashboard/services/:type/accept', protect, therapistOnly, async (req, res) => {
  try {
    const { type } = req.params;
    const therapist = await Therapist.findById(req.userId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    const svc = (therapist.approvedServices || []).find(s => s.type === type);
    if (!svc) return res.status(404).json({ message: 'Service not approved by admin' });
    svc.therapistAccepted = true;
    svc.therapistRejected = false;
    svc.acceptedAt = new Date();
    svc.rejectedAt = null;
    await therapist.save();
    res.json(therapist);
  } catch (error) {
    console.error('Accept service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/therapists/dashboard/services/request-change
// Body: { changes: [{ type, action: 'add'|'remove', minPrice?, maxPrice?, note? }] }
// Therapist (already approved) requests to add a new service or remove an existing one.
// Admin must approve. Notifies all admins.
router.post('/dashboard/services/request-change', protect, therapistOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.userId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    if (!therapist.isApproved) return res.status(400).json({ message: 'Only approved therapists can request service changes. New applicants should use the onboarding form.' });

    const { changes } = req.body || {};
    if (!Array.isArray(changes) || changes.length === 0) return res.status(400).json({ message: 'changes array required' });
    const validTypes = ['individual', 'couple', 'group', 'family', 'supervision'];
    const validActions = ['add', 'remove'];
    const cleaned = [];
    for (const c of changes) {
      if (!validTypes.includes(c?.type)) continue;
      if (!validActions.includes(c?.action)) continue;
      const item = {
        type: c.type,
        action: c.action,
        minPrice: Math.max(0, Number(c.minPrice) || 0),
        maxPrice: Math.max(0, Number(c.maxPrice) || 0),
        note: c.note || '',
        requestedAt: new Date(),
      };
      // Validation rules
      if (c.action === 'add') {
        if (item.maxPrice <= 0) return res.status(400).json({ message: `Max price required for adding "${c.type}".` });
        if (item.minPrice > item.maxPrice) return res.status(400).json({ message: `Min must be ≤ max for "${c.type}".` });
        // Don't allow adding a service the therapist already has approved+accepted
        const already = (therapist.approvedServices || []).some(s => s.type === c.type && s.therapistAccepted);
        if (already) return res.status(400).json({ message: `You already offer "${c.type}".` });
      } else if (c.action === 'remove') {
        // Must currently have it accepted
        const has = (therapist.approvedServices || []).some(s => s.type === c.type && s.therapistAccepted);
        if (!has) return res.status(400).json({ message: `You don't currently offer "${c.type}".` });
      }
      cleaned.push(item);
    }
    if (cleaned.length === 0) return res.status(400).json({ message: 'No valid changes to submit.' });

    therapist.pendingServiceChanges = cleaned;
    therapist.servicesPendingReview = true;
    therapist.servicesPendingReviewAt = new Date();
    await therapist.save();

    // Notify admins
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const { sendEmail } = await import('../utils/email.js');
      const admins = await Admin.find({}).select('_id name email');
      const summary = cleaned.map(c => `${c.action.toUpperCase()} ${c.type}${c.action === 'add' ? ` (₹${c.minPrice}-${c.maxPrice})` : ''}`).join(', ');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'service_change_request',
          `Service change request: ${therapist.name}`,
          summary,
          '/admin-dashboard'
        ).catch(() => {});
        if (a.email) {
          sendEmail(a.email, `Service change request — ${therapist.name}`,
            `<p>Hi ${a.name || 'Admin'},</p><p>${therapist.name} has requested the following service changes:</p><ul>${cleaned.map(c => `<li>${c.action === 'add' ? '➕ Add' : '➖ Remove'} <strong>${c.type}</strong>${c.action === 'add' ? ` at ₹${c.minPrice}-${c.maxPrice}` : ''}${c.note ? ` — ${c.note}` : ''}</li>`).join('')}</ul><p>Review and approve in the admin dashboard.</p>`
          ).catch(() => {});
        }
      }
    } catch {}

    res.json(therapist);
  } catch (error) {
    console.error('Service change request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/therapists/dashboard/services/:type/reject
router.post('/dashboard/services/:type/reject', protect, therapistOnly, async (req, res) => {
  try {
    const { type } = req.params;
    const therapist = await Therapist.findById(req.userId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    const svc = (therapist.approvedServices || []).find(s => s.type === type);
    if (!svc) return res.status(404).json({ message: 'Service not approved by admin' });
    svc.therapistRejected = true;
    svc.therapistAccepted = false;
    svc.rejectedAt = new Date();
    svc.acceptedAt = null;
    await therapist.save();

    // Notify admins so they can negotiate
    try {
      const Admin = (await import('../models/Admin.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const admins = await Admin.find({}).select('_id');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'service_rejected',
          `${therapist.name} rejected service: ${type}`,
          `Therapist rejected the admin-approved pricing for "${type}". Negotiate via chat or update the service.`,
          '/admin-dashboard'
        ).catch(() => {});
      }
    } catch {}

    res.json(therapist);
  } catch (error) {
    console.error('Reject service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== THERAPIST ONBOARDING ====================

// POST /api/therapists/onboard - accept T&C and request approval
// Requires: profile fields (title, experience, specializations, languages, bio, pricing) AND resume
router.post('/onboard', protect, therapistOnly, async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.userId);
    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found' });
    }

    if (therapist.isOnboarded) {
      return res.status(400).json({ message: 'Already onboarded', status: therapist.onboardingStatus });
    }

    // Validate required profile fields
    const missing = [];
    if (!therapist.title || !therapist.title.trim()) missing.push('Title');
    if (therapist.experience == null || therapist.experience < 0) missing.push('Experience');
    if (!therapist.bio || !therapist.bio.trim()) missing.push('Bio');
    if (!therapist.specializations || therapist.specializations.length === 0) missing.push('Specializations');
    if (!therapist.languages || therapist.languages.length === 0) missing.push('Languages');
    // Pricing is set by admin AFTER interview/approval — not required from therapist anymore
    if (!therapist.resume || !therapist.resume.trim()) missing.push('Resume');

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Please complete the following before submitting for review: ${missing.join(', ')}`,
        missing,
      });
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
    if (obj.pricing instanceof Map) obj.pricing = Object.fromEntries(obj.pricing);
    if (obj.pricingMin instanceof Map) obj.pricingMin = Object.fromEntries(obj.pricingMin);
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/profile
router.put('/dashboard/profile', protect, therapistOnly, async (req, res) => {
  try {
    // NOTE: 'pricing' and 'pricingMin' are admin-controlled (set after interview).
    // We accept them ONLY when the therapist isn't yet onboarded (initial preference);
    // post-onboarding edits to pricing must come from admin via PUT /admin/therapists/:id/pricing.
    const baseAllowed = ['name', 'title', 'phone', 'specializations', 'experience', 'bio', 'languages', 'calendlyLink', 'image', 'maxSessionsPerDay', 'educationBackground', 'courses', 'highestEducation', 'slidingScaleAvailable'];
    const isPreOnboarding = !req.user?.isOnboarded;
    const allowed = isPreOnboarding ? [...baseAllowed, 'pricing', 'pricingMin'] : baseAllowed;
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const therapist = await Therapist.findByIdAndUpdate(req.userId, updates, { new: true }).select('-password');
    const obj = therapist.toObject();
    if (obj.pricing instanceof Map) obj.pricing = Object.fromEntries(obj.pricing);
    if (obj.pricingMin instanceof Map) obj.pricingMin = Object.fromEntries(obj.pricingMin);
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

    // Fetch all then filter using endTime so an in-progress session stays "upcoming" until it ends.
    const allSessions = await Session.find(query)
      .populate('clientId', 'name email phone')
      .sort({ date: -1 });

    const now = new Date();
    const sessionEndAt = (s) => {
      const d = new Date(s.date);
      const [h, m] = (s.endTime || '00:00').split(':');
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      return d;
    };
    const isUpcoming = (s) => s.status === 'scheduled' && sessionEndAt(s) >= now;

    let sessions = allSessions;
    if (timeframe === 'upcoming') sessions = allSessions.filter(isUpcoming).sort((a, b) => sessionEndAt(a) - sessionEndAt(b));
    else if (timeframe === 'past') sessions = allSessions.filter(s => !isUpcoming(s));

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/therapists/dashboard/stats
// EARNINGS RULES:
// - Revenue is generated by sessions whose status is 'completed' OR 'no-show'
//   (no-shows are billed since therapist's time was reserved).
// - Total Hours = duration of COMPLETED sessions only (no-shows have no contact hours).
// - Successful Sessions = completed only.
// - Sessions Taken (revenue-generating) = completed + no-show.
router.get('/dashboard/stats', protect, therapistOnly, async (req, res) => {
  try {
    const allSessions = await Session.find({ therapistId: req.userId });
    const completedSessions = allSessions.filter(s => s.status === 'completed');
    const noShowSessions = allSessions.filter(s => s.status === 'no-show');
    const billableSessions = [...completedSessions, ...noShowSessions]; // both pay the therapist
    const upcomingSessions = allSessions.filter(s => {
      if (s.status !== 'scheduled') return false;
      const d = new Date(s.date);
      const [h, m] = (s.endTime || '00:00').split(':');
      d.setHours(parseInt(h), parseInt(m), 0, 0);
      return d >= new Date();
    });

    const totalHours = completedSessions.reduce((sum, s) => sum + (s.duration / 60), 0);

    // Total earnings = sum of session.amount for billable sessions (completed + no-show)
    const totalEarnings = billableSessions.reduce((sum, s) => sum + (s.amount || 0), 0);

    // Get therapist's commission percentage
    const therapist = await Therapist.findById(req.userId).select('commissionPercent');
    const commissionPct = therapist?.commissionPercent ?? 60;

    // Build monthly earnings from billable sessions (uses session.date, not Payment.createdAt)
    const monthlyEarnings = {};
    billableSessions.forEach(s => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyEarnings[key] = (monthlyEarnings[key] || 0) + (s.amount || 0);
    });

    const monthlyBreakdown = Object.entries(monthlyEarnings).map(([month, total]) => ({
      month,
      totalRevenue: total,
      therapistShare: Math.round(total * commissionPct / 100),
      ehsaasShare: Math.round(total * (100 - commissionPct) / 100),
    })).sort((a, b) => b.month.localeCompare(a.month));

    const lifetimeTherapistShare = Math.round(totalEarnings * commissionPct / 100);
    const lifetimeEhsaasShare = Math.round(totalEarnings * (100 - commissionPct) / 100);

    res.json({
      totalSessions: allSessions.length,                       // ALL bookings (any status)
      completedSessions: completedSessions.length,             // successful only
      noShowSessions: noShowSessions.length,
      billableSessions: billableSessions.length,               // completed + no-show (revenue)
      upcomingSessions: upcomingSessions.length,
      totalHours: Math.round(totalHours * 10) / 10,            // hours of COMPLETED only
      totalEarnings,
      lifetimeTherapistShare,
      lifetimeEhsaasShare,
      commissionPercent: commissionPct,
      monthlyEarnings,
      monthlyBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/sessions/:sessionId/status
router.put('/dashboard/sessions/:sessionId/status', protect, therapistOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'no-show', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const update = { status };
    if (status === 'no-show') update.noShowEmailSent = true;
    const session = await Session.findOneAndUpdate(
      { _id: req.params.sessionId, therapistId: req.userId },
      update,
      { new: true }
    ).populate('clientId', 'name email').populate('therapistId', 'name');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // If completed, update therapist stats
    if (status === 'completed') {
      await Therapist.findByIdAndUpdate(req.userId, {
        $inc: { totalSessions: 1, totalHours: session.duration / 60 }
      });
    }

    // No-show: send email + flag check
    if (status === 'no-show') {
      try {
        const { sendEmail } = await import('../utils/email.js');
        const { checkNoShowFlag } = await import('../utils/clientFlags.js');
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
            <p>Frequent no-shows may affect future bookings. If something came up, please reach out to <a href="mailto:sessions@ehsaastherapycentre.com">sessions@ehsaastherapycentre.com</a>.</p>
          </div>`;
        if (session.clientId?.email) {
          sendEmail(session.clientId.email, 'Session marked as no-show', html).catch(e => console.error('[NOSHOW]', e.message));
        }
        Notification.notify(session.clientId._id, 'client', 'no_show',
          'Session missed',
          `Your session with ${session.therapistId?.name || 'your therapist'} was marked as no-show.`,
          '/client-dashboard?tab=past'
        ).catch(() => {});
        checkNoShowFlag(session.clientId._id).catch(e => console.error('[FLAG]', e));
      } catch (e) { console.error('[NOSHOW MANUAL]', e.message); }
    } else if (status === 'cancelled') {
      try {
        const { checkCancellationFlag } = await import('../utils/clientFlags.js');
        checkCancellationFlag(session.clientId._id).catch(() => {});
      } catch {}
    }

    res.json(session);
  } catch (error) {
    console.error('Set status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SESSION NOTES (Structured) ====================

// GET /api/therapists/dashboard/sessions/:sessionId/notes
router.get('/dashboard/sessions/:sessionId/notes', protect, therapistOnly, async (req, res) => {
  try {
    const { hasActiveAccess, isPastRelationship } = await import('../utils/relationshipAccess.js');
    // Find session by id (any therapist who conducted it OR has active relationship can read)
    const session = await Session.findById(req.params.sessionId).populate('clientId', 'name');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const isOwner = String(session.therapistId) === String(req.userId);
    const hasAccess = await hasActiveAccess(req.userId, session.clientId._id);
    const wasTransferredAway = isOwner && await isPastRelationship(req.userId, session.clientId._id);

    if (wasTransferredAway) {
      return res.status(403).json({ message: 'This client has been transferred to another therapist. You no longer have access to these notes.' });
    }
    if (!isOwner && !hasAccess) {
      return res.status(403).json({ message: 'Not authorized to view these notes' });
    }

    // Session number — count across all therapists for this client (transferred-in therapists see complete history)
    const sessionNumber = await Session.countDocuments({
      clientId: session.clientId._id,
      status: 'completed',
      date: { $lte: session.date },
    });

    const therapist = await Therapist.findById(session.therapistId).select('name');

    res.json({
      notes: session.notes || {},
      sessionNumber,
      clientName: session.clientId?.name || 'Client',
      therapistName: therapist?.name || 'Therapist',
      sessionDate: session.date,
      conductedByOtherTherapist: !isOwner,
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/therapists/dashboard/sessions/:sessionId/notes
router.put('/dashboard/sessions/:sessionId/notes', protect, therapistOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    const { isPastRelationship } = await import('../utils/relationshipAccess.js');
    const session = await Session.findOne({ _id: req.params.sessionId, therapistId: req.userId });
    if (!session) return res.status(404).json({ message: 'Session not found, or you are not the conducting therapist' });
    // Block writes if therapist was transferred away
    if (await isPastRelationship(req.userId, session.clientId)) {
      return res.status(403).json({ message: 'You no longer have access to this client.' });
    }
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
    const { hasActiveAccess, isPastRelationship } = await import('../utils/relationshipAccess.js');

    // Block if therapist was transferred away
    if (await isPastRelationship(req.userId, req.params.clientId)) {
      return res.status(403).json({ message: 'You no longer have access to this client.' });
    }

    // Try therapist's own history first, then fall back to any history for this client
    // (so a transferred-in therapist sees the previous therapist's recorded history)
    let history = await ClientHistory.findOne({ clientId: req.params.clientId, therapistId: req.userId });
    if (!history) {
      const hasAccess = await hasActiveAccess(req.userId, req.params.clientId);
      if (hasAccess) {
        // Read-only view of any prior therapist's history
        history = await ClientHistory.findOne({ clientId: req.params.clientId }).sort({ updatedAt: -1 });
      }
    }
    res.json(history || null);
  } catch (error) {
    console.error('Get client history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/therapists/dashboard/client-history
router.post('/dashboard/client-history', protect, therapistOnly, async (req, res) => {
  try {
    const ClientHistory = (await import('../models/ClientHistory.js')).default;
    const { isPastRelationship } = await import('../utils/relationshipAccess.js');
    const { clientId, ...data } = req.body;

    if (await isPastRelationship(req.userId, clientId)) {
      return res.status(403).json({ message: 'You no longer have access to this client.' });
    }

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
    const Relationship = (await import('../models/ClientTherapistRelationship.js')).default;

    // Active client IDs from relationships table
    const activeRels = await Relationship.find({ therapistId: therapistOid, status: 'active' }).select('clientId');
    let clientIds = activeRels.map(r => r.clientId);

    // Fallback for clients with sessions but no relationship row yet (legacy data) — backfill as active
    const sessionClientIds = await Session.find({ therapistId: therapistOid }).distinct('clientId');
    const haveRelFor = new Set(await Relationship.find({ therapistId: therapistOid }).distinct('clientId').then(arr => arr.map(String)));
    const missing = sessionClientIds.filter(id => !haveRelFor.has(String(id)));
    if (missing.length > 0) {
      // Backfill (active by default) — best effort, ignore duplicates
      await Promise.all(missing.map(cid => Relationship.findOneAndUpdate(
        { clientId: cid, therapistId: therapistOid },
        { $setOnInsert: { status: 'active', startedAt: new Date() } },
        { upsert: true, new: true }
      ).catch(() => null)));
      clientIds = [...clientIds, ...missing];
    }

    const Client = (await import('../models/Client.js')).default;
    const clients = await Client.find({ _id: { $in: clientIds } }).select('name email').sort({ name: 1 });
    res.json(clients);
  } catch (error) {
    console.error('My-clients error:', error);
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
      res.json({ resume: therapist.resume, user: therapist, message: 'Resume uploaded successfully' });
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
