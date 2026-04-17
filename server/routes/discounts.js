import express from 'express';
import DiscountCode from '../models/DiscountCode.js';
import SessionPackage from '../models/SessionPackage.js';
import ClientPackage from '../models/ClientPackage.js';
import { protect, clientOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ==================== DISCOUNT CODES ====================

// POST /api/discounts/codes — admin creates discount code
router.post('/codes', protect, adminOnly, async (req, res) => {
  try {
    const code = await DiscountCode.create({ ...req.body, createdBy: req.userId });
    res.status(201).json(code);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/discounts/codes — admin lists all codes
router.get('/codes', protect, adminOnly, async (req, res) => {
  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 });
    res.json(codes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/discounts/codes/:id — admin updates code
router.put('/codes/:id', protect, adminOnly, async (req, res) => {
  try {
    const code = await DiscountCode.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!code) return res.status(404).json({ message: 'Not found' });
    res.json(code);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/discounts/validate — client validates a discount code
router.post('/validate', protect, clientOnly, async (req, res) => {
  try {
    const { code, amount } = req.body;
    const discount = await DiscountCode.findOne({ code: code.toUpperCase(), isActive: true });

    if (!discount) return res.status(404).json({ message: 'Invalid discount code' });

    const now = new Date();
    if (now < discount.validFrom || now > discount.validTo) {
      return res.status(400).json({ message: 'Discount code has expired' });
    }
    if (discount.maxUses > 0 && discount.currentUses >= discount.maxUses) {
      return res.status(400).json({ message: 'Discount code has been fully redeemed' });
    }

    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = Math.round((amount * discount.value) / 100);
    } else {
      discountAmount = Math.min(discount.value, amount);
    }

    res.json({
      valid: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
      finalAmount: amount - discountAmount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SESSION PACKAGES ====================

// POST /api/discounts/packages — admin creates package
router.post('/packages', protect, adminOnly, async (req, res) => {
  try {
    const pkg = await SessionPackage.create(req.body);
    res.status(201).json(pkg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/discounts/packages — list active packages (public)
router.get('/packages', async (req, res) => {
  try {
    const packages = await SessionPackage.find({ isActive: true });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/discounts/packages/admin — admin lists all packages
router.get('/packages/admin', protect, adminOnly, async (req, res) => {
  try {
    const packages = await SessionPackage.find().sort({ createdAt: -1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/discounts/packages/:id/purchase — client purchases package
router.post('/packages/:id/purchase', protect, clientOnly, async (req, res) => {
  try {
    const pkg = await SessionPackage.findById(req.params.id);
    if (!pkg || !pkg.isActive) return res.status(404).json({ message: 'Package not found' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const clientPkg = await ClientPackage.create({
      clientId: req.userId,
      packageId: pkg._id,
      sessionsRemaining: pkg.sessionCount,
      expiresAt,
    });

    res.status(201).json(clientPkg);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/discounts/my-packages — client's purchased packages
router.get('/my-packages', protect, clientOnly, async (req, res) => {
  try {
    const packages = await ClientPackage.find({ clientId: req.userId })
      .populate('packageId')
      .sort({ createdAt: -1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
