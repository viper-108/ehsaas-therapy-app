import express from 'express';
import TrainingProgram from '../models/TrainingProgram.js';
import TrainingRegistration from '../models/TrainingRegistration.js';
import Therapist from '../models/Therapist.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, therapistOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const liveStatus = (t) => {
  if (['rejected', 'cancelled', 'pending_admin'].includes(t.status)) return t.status;
  const now = new Date();
  if (t.endDate && now > new Date(t.endDate)) return 'completed';
  if (t.startDate && now >= new Date(t.startDate)) return 'ongoing';
  return 'upcoming';
};

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

// =============== THERAPIST CREATES TRAINING REQUEST ===============
router.post('/request', protect, therapistOnly, async (req, res) => {
  try {
    const {
      title, about, outcomes, targetAudience, syllabus, syllabusBrochureUrl,
      facilitators, startDate, endDate, totalDurationHours, sessionDates, sessionTime,
      frequency, totalSessions, durationMinutes, language, mode,
      pricePerTrainee, capacity, certificateProvided,
      facilitatorCommitmentHours, traineeCommitmentHours,
    } = req.body || {};

    if (!title || !pricePerTrainee || !startDate) {
      return res.status(400).json({ message: 'title, pricePerTrainee, startDate are required' });
    }

    // Always include the requester as a facilitator (with their info)
    const me = await Therapist.findById(req.userId).select('name title experience');
    const facList = [];
    facList.push({
      therapistId: me?._id,
      name: me?.name || '',
      credentials: me?.title || '',
      experience: me?.experience ? `${me.experience}+ years` : '',
    });
    if (Array.isArray(facilitators)) {
      for (const f of facilitators) {
        if (!f) continue;
        if (f.therapistId && String(f.therapistId) === String(req.userId)) continue;
        facList.push({
          therapistId: f.therapistId || null,
          name: f.name || '',
          credentials: f.credentials || '',
          experience: f.experience || '',
        });
      }
    }

    const t = await TrainingProgram.create({
      title: title.trim(),
      about: about || '',
      outcomes: outcomes || '',
      targetAudience: targetAudience || '',
      facilitators: facList,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      totalDurationHours: Number(totalDurationHours) || 0,
      sessionDates: Array.isArray(sessionDates) ? sessionDates.map(d => new Date(d)).filter(d => !isNaN(d.valueOf())) : [],
      sessionTime: sessionTime || '',
      frequency: frequency || '',
      totalSessions: Number(totalSessions) || 1,
      durationMinutes: Number(durationMinutes) || 90,
      syllabus: syllabus || '',
      syllabusBrochureUrl: syllabusBrochureUrl || '',
      facilitatorCommitmentHours: Number(facilitatorCommitmentHours) || 0,
      traineeCommitmentHours: Number(traineeCommitmentHours) || 0,
      language: language || 'English',
      mode: mode || 'online',
      pricePerTrainee: Number(pricePerTrainee),
      capacity: capacity ? Number(capacity) : null,
      certificateProvided: certificateProvided !== false,
      status: 'pending_admin',
    });

    notifyAdmins('training_request', `Training request: ${title}`,
      `${me?.name || 'A therapist'} requested approval for the training "${title}". ${facList.length} facilitator(s).`,
      '/admin-dashboard?tab=pending');

    res.status(201).json(t);
  } catch (e) {
    console.error('Create training error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// =============== ADMIN APPROVE / REJECT ===============
router.put('/:id/admin-approve', protect, adminOnly, async (req, res) => {
  try {
    const t = await TrainingProgram.findById(req.params.id).populate('facilitators.therapistId', 'name email');
    if (!t) return res.status(404).json({ message: 'Training not found' });
    if (t.status !== 'pending_admin') return res.status(400).json({ message: 'Only pending trainings can be approved' });
    t.status = 'upcoming';
    t.approvedAt = new Date();
    await t.save();
    for (const f of t.facilitators || []) {
      if (f.therapistId?._id) {
        Notification.notify(f.therapistId._id, 'therapist', 'training_approved',
          `Training approved: ${t.title}`,
          `Trainees can now register. Starts ${new Date(t.startDate).toLocaleString('en-IN')}.`,
          '/therapist-dashboard'
        ).catch(() => {});
        if (f.therapistId.email) {
          sendEmail(f.therapistId.email, `Training approved — ${t.title}`,
            `<p>Hi ${f.therapistId.name},</p><p>Your training program <strong>${t.title}</strong> has been approved by admin.</p>`
          ).catch(() => {});
        }
      }
    }
    res.json(t);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id/admin-reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const t = await TrainingProgram.findByIdAndUpdate(req.params.id, {
      status: 'rejected', rejectedAt: new Date(), rejectionReason: reason || '',
    }, { new: true }).populate('facilitators.therapistId', 'name email');
    if (!t) return res.status(404).json({ message: 'Training not found' });
    for (const f of t.facilitators || []) {
      if (f.therapistId?._id) {
        Notification.notify(f.therapistId._id, 'therapist', 'training_rejected',
          `Training not approved: ${t.title}`, reason || 'Admin did not approve this training.',
          '/therapist-dashboard'
        ).catch(() => {});
      }
    }
    res.json(t);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// =============== PUBLIC LISTING ===============
router.get('/', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const list = await TrainingProgram.find({ status: { $in: ['upcoming', 'ongoing', 'completed'] } })
      .populate('facilitators.therapistId', 'name title image')
      .sort({ startDate: 1 });
    const enriched = list.map(t => ({ ...t.toObject(), liveStatus: liveStatus(t) }));
    const filtered = status === 'all' ? enriched : enriched.filter(t => {
      if (status === 'upcoming') return t.liveStatus === 'upcoming';
      if (status === 'ongoing') return t.liveStatus === 'ongoing';
      if (status === 'past') return t.liveStatus === 'completed';
      return true;
    });
    res.json(filtered);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const t = await TrainingProgram.findById(req.params.id)
      .populate('facilitators.therapistId', 'name title image bio specializations');
    if (!t) return res.status(404).json({ message: 'Training not found' });
    res.json({ ...t.toObject(), liveStatus: liveStatus(t) });
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// =============== ADMIN PENDING ===============
router.get('/admin/pending', protect, adminOnly, async (req, res) => {
  try {
    const list = await TrainingProgram.find({ status: 'pending_admin' })
      .populate('facilitators.therapistId', 'name title image')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// =============== THERAPIST'S OWN TRAININGS ===============
router.get('/my/leading', protect, therapistOnly, async (req, res) => {
  try {
    const list = await TrainingProgram.find({ 'facilitators.therapistId': req.userId })
      .sort({ startDate: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

// =============== USER REGISTERS ===============
router.post('/:id/register', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client' && req.userRole !== 'therapist') {
      return res.status(403).json({ message: 'Only clients or therapists can register' });
    }
    const t = await TrainingProgram.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Training not found' });
    if (!['upcoming', 'ongoing'].includes(t.status)) return res.status(400).json({ message: 'Training not open for registration.' });
    if (t.capacity && t.registeredCount >= t.capacity) return res.status(400).json({ message: 'Training is at capacity.' });

    const existing = await TrainingRegistration.findOne({ trainingId: t._id, userId: req.userId });
    if (existing) return res.status(400).json({ message: 'You are already registered.' });

    const reg = await TrainingRegistration.create({
      trainingId: t._id,
      userId: req.userId,
      userRole: req.userRole,
    });
    await TrainingProgram.findByIdAndUpdate(t._id, { $inc: { registeredCount: 1 } });

    Notification.notify(req.userId, req.userRole, 'training_registered',
      `Registered for ${t.title}`,
      `Complete payment to confirm your spot. Joining link will be shared closer to start.`,
      `/trainings/${t._id}`
    ).catch(() => {});

    res.status(201).json(reg);
  } catch (e) {
    console.error('Training register error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my/registrations', protect, async (req, res) => {
  try {
    const list = await TrainingRegistration.find({ userId: req.userId })
      .populate('trainingId')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
