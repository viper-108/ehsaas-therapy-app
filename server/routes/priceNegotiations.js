import express from 'express';
import PriceNegotiation from '../models/PriceNegotiation.js';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, therapistOnly, clientOnly } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// Helper — get the price a given client should be charged for a given (therapist, duration)
// (Used by booking/checkout.) Returns the negotiated price if approved, else max price.
export const getPriceForClient = async (therapistId, clientId, duration) => {
  const therapist = await Therapist.findById(therapistId).select('pricing');
  const pricing = therapist?.pricing instanceof Map ? Object.fromEntries(therapist.pricing) : (therapist?.pricing || {});
  const maxPrice = pricing[String(duration)] || pricing[Number(duration)] || 0;
  if (!clientId) return maxPrice;
  const neg = await PriceNegotiation.findOne({
    clientId, therapistId, duration: String(duration), status: 'approved'
  }).sort({ approvedAt: -1 });
  return neg ? neg.proposedPrice : maxPrice;
};

// ================== ENABLE NEGOTIATION ==================
// POST /api/price-negotiations/enable
// Body: { clientId, therapistId, duration }
// Therapist (only for their own clients) or admin can enable.
router.post('/enable', protect, async (req, res) => {
  try {
    if (req.userRole !== 'therapist' && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Only therapist or admin can enable negotiation' });
    }
    const { clientId, therapistId: bodyTherapistId, duration } = req.body || {};
    if (!clientId || !duration) return res.status(400).json({ message: 'clientId and duration required' });

    const therapistId = req.userRole === 'therapist' ? req.userId : bodyTherapistId;
    if (!therapistId) return res.status(400).json({ message: 'therapistId required' });

    const therapist = await Therapist.findById(therapistId);
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });

    const pricing = therapist.pricing instanceof Map ? Object.fromEntries(therapist.pricing) : (therapist.pricing || {});
    const pricingMin = therapist.pricingMin instanceof Map ? Object.fromEntries(therapist.pricingMin) : (therapist.pricingMin || {});
    const maxPrice = pricing[String(duration)];
    const minPrice = pricingMin[String(duration)];
    if (!maxPrice) return res.status(400).json({ message: `Therapist has no price set for ${duration} min` });
    if (!minPrice || minPrice >= maxPrice) {
      return res.status(400).json({ message: `Therapist must set a minimum price (less than ₹${maxPrice}) for ${duration} min before negotiation can begin.` });
    }

    // Don't create duplicate active negotiation
    const existing = await PriceNegotiation.findOne({
      clientId, therapistId, duration: String(duration),
      status: { $in: ['invited', 'proposed', 'partially_approved'] }
    });
    if (existing) return res.status(400).json({ message: 'A negotiation is already in progress for this client/therapist/duration' });

    const neg = await PriceNegotiation.create({
      clientId, therapistId, duration: String(duration),
      originalPrice: maxPrice, minPrice,
      enabledBy: req.userRole, enabledByUserId: req.userId,
      status: 'invited',
    });

    // Notify client
    const client = await Client.findById(clientId).select('name email');
    if (client) {
      Notification.notify(clientId, 'client', 'price_negotiation',
        'You can request a lower session price',
        `${therapist.name} has invited you to propose a lower price (between ₹${minPrice} and ₹${maxPrice}) for a ${duration}-min session.`,
        '/client-dashboard?tab=profile'
      ).catch(() => {});
      if (client.email) {
        const html = `<p>Hi ${client.name},</p>
          <p>${therapist.name} has invited you to propose a lower price for ${duration}-minute sessions.</p>
          <p>You can submit any price between <strong>₹${minPrice}</strong> and <strong>₹${maxPrice}</strong>.</p>
          <p>Login to your dashboard to submit your proposed price. Once you do, both your therapist and Ehsaas admin will need to approve it.</p>`;
        sendEmail(client.email, 'Lower session price negotiation invited — Ehsaas', html).catch(() => {});
      }
    }

    res.status(201).json(neg);
  } catch (e) {
    console.error('Enable negotiation error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== CLIENT PROPOSES PRICE ==================
// POST /api/price-negotiations/:id/propose
router.post('/:id/propose', protect, clientOnly, async (req, res) => {
  try {
    const { proposedPrice } = req.body || {};
    if (!proposedPrice || isNaN(Number(proposedPrice))) return res.status(400).json({ message: 'proposedPrice required' });

    const neg = await PriceNegotiation.findById(req.params.id);
    if (!neg) return res.status(404).json({ message: 'Negotiation not found' });
    if (String(neg.clientId) !== String(req.userId)) return res.status(403).json({ message: 'Not your negotiation' });
    if (!['invited', 'proposed'].includes(neg.status)) return res.status(400).json({ message: 'Cannot propose at this stage' });

    const price = Number(proposedPrice);
    if (price < neg.minPrice || price > neg.originalPrice) {
      return res.status(400).json({ message: `Proposed price must be between ₹${neg.minPrice} and ₹${neg.originalPrice}` });
    }

    neg.proposedPrice = price;
    neg.status = 'proposed';
    // Reset approvals if they previously approved a different number
    neg.therapistApproved = false; neg.therapistApprovedAt = null;
    neg.adminApproved = false; neg.adminApprovedAt = null;
    await neg.save();

    // Notify therapist + admins
    const [therapist, client] = await Promise.all([
      Therapist.findById(neg.therapistId).select('name email'),
      Client.findById(neg.clientId).select('name email'),
    ]);

    Notification.notify(neg.therapistId, 'therapist', 'price_negotiation',
      `Price proposal from ${client?.name || 'a client'}`,
      `${client?.name || 'Client'} proposed ₹${price} for ${neg.duration}-min sessions. Please approve or reject.`,
      '/therapist-dashboard?tab=earnings'
    ).catch(() => {});

    try {
      const Admin = (await import('../models/Admin.js')).default;
      const admins = await Admin.find({}).select('_id email');
      for (const a of admins) {
        Notification.notify(a._id, 'admin', 'price_negotiation',
          `Price proposal: ${client?.name || 'client'} → ${therapist?.name || 'therapist'}`,
          `Proposed ₹${price} for ${neg.duration}-min (range ₹${neg.minPrice}-₹${neg.originalPrice}). Both therapist and admin must approve.`,
          '/admin-dashboard'
        ).catch(() => {});
      }
    } catch {}

    if (therapist?.email) {
      sendEmail(therapist.email, 'Price proposal awaiting your approval — Ehsaas',
        `<p>Hi ${therapist.name},</p><p>Client <strong>${client?.name}</strong> has proposed <strong>₹${price}</strong> for ${neg.duration}-min sessions (your range: ₹${neg.minPrice}-₹${neg.originalPrice}).</p><p>Login to approve or reject this proposal.</p>`
      ).catch(() => {});
    }

    res.json(neg);
  } catch (e) {
    console.error('Propose price error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== APPROVE ==================
// POST /api/price-negotiations/:id/approve
router.post('/:id/approve', protect, async (req, res) => {
  try {
    if (req.userRole !== 'therapist' && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Only therapist or admin can approve' });
    }
    const neg = await PriceNegotiation.findById(req.params.id);
    if (!neg) return res.status(404).json({ message: 'Negotiation not found' });
    if (req.userRole === 'therapist' && String(neg.therapistId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your negotiation' });
    }
    if (!['proposed', 'partially_approved'].includes(neg.status)) {
      return res.status(400).json({ message: 'Cannot approve at this stage (waiting for client to propose a price first)' });
    }

    if (req.userRole === 'therapist') {
      neg.therapistApproved = true;
      neg.therapistApprovedAt = new Date();
    } else {
      neg.adminApproved = true;
      neg.adminApprovedAt = new Date();
    }

    if (neg.therapistApproved && neg.adminApproved) {
      neg.status = 'approved';
      neg.approvedAt = new Date();
    } else {
      neg.status = 'partially_approved';
    }
    await neg.save();

    // Notify client when fully approved
    if (neg.status === 'approved') {
      const therapist = await Therapist.findById(neg.therapistId).select('name');
      const client = await Client.findById(neg.clientId).select('name email');
      Notification.notify(neg.clientId, 'client', 'price_negotiation',
        'Your price proposal was approved!',
        `Your new price ₹${neg.proposedPrice} for ${neg.duration}-min sessions with ${therapist?.name || 'your therapist'} is now active.`,
        '/client-dashboard?tab=find-therapist'
      ).catch(() => {});
      if (client?.email) {
        sendEmail(client.email, 'Your price proposal was approved — Ehsaas',
          `<p>Hi ${client.name},</p><p>Both your therapist and the Ehsaas team have approved your proposed price of <strong>₹${neg.proposedPrice}</strong> for ${neg.duration}-min sessions.</p><p>You'll be charged this rate on all future bookings with this therapist.</p>`
        ).catch(() => {});
      }
    }

    res.json(neg);
  } catch (e) {
    console.error('Approve error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== REJECT ==================
// POST /api/price-negotiations/:id/reject
router.post('/:id/reject', protect, async (req, res) => {
  try {
    if (req.userRole !== 'therapist' && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Only therapist or admin can reject' });
    }
    const { reason } = req.body || {};
    const neg = await PriceNegotiation.findById(req.params.id);
    if (!neg) return res.status(404).json({ message: 'Negotiation not found' });
    if (req.userRole === 'therapist' && String(neg.therapistId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your negotiation' });
    }
    neg.status = 'rejected';
    neg.rejectedBy = req.userRole;
    neg.rejectionReason = reason || '';
    await neg.save();

    // Notify client
    Notification.notify(neg.clientId, 'client', 'price_negotiation',
      'Price proposal rejected',
      `Your price proposal was rejected by ${req.userRole === 'therapist' ? 'your therapist' : 'Ehsaas team'}.${reason ? ` Reason: ${reason}` : ''}`,
      '/client-dashboard'
    ).catch(() => {});

    res.json(neg);
  } catch (e) {
    console.error('Reject error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== LISTING ==================
// GET /api/price-negotiations/my  — caller-scoped
// - therapist: their negotiations
// - client: their negotiations
// - admin: all
router.get('/my', protect, async (req, res) => {
  try {
    let query = {};
    if (req.userRole === 'therapist') query.therapistId = req.userId;
    else if (req.userRole === 'client') query.clientId = req.userId;
    // admin → all

    const list = await PriceNegotiation.find(query)
      .populate('clientId', 'name email')
      .populate('therapistId', 'name title')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
