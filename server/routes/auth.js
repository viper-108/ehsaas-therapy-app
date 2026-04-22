import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Therapist from '../models/Therapist.js';
import Client from '../models/Client.js';
import Admin from '../models/Admin.js';
import { generateToken, protect } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5174';

// ==================== FORGOT / RESET PASSWORD ====================

const findUserByEmail = async (email, role) => {
  if (role === 'therapist') return Therapist.findOne({ email });
  if (role === 'client') return Client.findOne({ email });
  if (role === 'admin') return Admin.findOne({ email });
  // Auto-detect role
  const lookups = await Promise.all([
    Therapist.findOne({ email }),
    Client.findOne({ email }),
    Admin.findOne({ email }),
  ]);
  const roles = ['therapist', 'client', 'admin'];
  for (let i = 0; i < lookups.length; i++) if (lookups[i]) return { user: lookups[i], role: roles[i] };
  return null;
};

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const result = await findUserByEmail(email, role);

    let user, foundRole;
    if (result?.user) { user = result.user; foundRole = result.role; }
    else if (result) { user = result; foundRole = role; }

    if (!user) {
      return res.status(404).json({ message: 'This email is not registered' });
    }

    // Admins can't reset via this flow
    if (foundRole === 'admin') {
      return res.status(400).json({ message: 'Admin password reset is not available through this form. Contact support.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password?token=${token}&role=${foundRole}`;
    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: #D97706; color: white; padding: 20px;"><h2>Reset your password</h2></div>
        <div style="padding: 24px; border: 1px solid #eee;">
          <p>Hi ${user.name || 'there'},</p>
          <p>Click the link below to set a new password for your Ehsaas account. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:4px;text-decoration:none;">Reset Password</a></p>
          <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>`;
    // Fire and forget — don't block response on SMTP
    sendEmail(user.email, 'Reset your Ehsaas password', html).catch(err =>
      console.error('[FORGOT-PW] Email send failed:', err.message)
    );
    res.json({ message: 'A password reset link has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, role, password } = req.body;
    if (!token || !password || !role) return res.status(400).json({ message: 'Missing token, role, or password' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const Model = role === 'therapist' ? Therapist : role === 'client' ? Client : null;
    if (!Model) return res.status(400).json({ message: 'Invalid role' });

    const user = await Model.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Token invalid or expired' });

    user.password = password; // pre-save will hash
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.json({ message: 'Password updated. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== OTP LOGIN (CLIENTS) ====================

// POST /api/auth/client/request-otp — sends 6-digit OTP to client email
router.post('/client/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ message: 'This email is not registered as a client' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    client.otpCode = await bcrypt.hash(otp, 10);
    client.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await client.save();

    const html = `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <div style="background: #D97706; color: white; padding: 20px;"><h2>Your Ehsaas login code</h2></div>
        <div style="padding: 24px; border: 1px solid #eee;">
          <p>Hi ${client.name},</p>
          <p>Use this code to log in. It expires in 10 minutes.</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;">${otp}</p>
          <p style="color:#666;font-size:13px;">If you didn't request this, you can ignore this email.</p>
        </div>
      </div>`;
    // Fire and forget — don't block response on SMTP
    sendEmail(client.email, `Your Ehsaas login code: ${otp}`, html).catch(err =>
      console.error('[OTP] Email send failed:', err.message)
    );
    res.json({ message: 'A 6-digit code has been sent to your email.' });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/client/verify-otp — verify OTP and log client in
router.post('/client/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
    const client = await Client.findOne({ email });
    if (!client || !client.otpCode || !client.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    if (client.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Code expired' });
    }
    const matches = await bcrypt.compare(otp, client.otpCode);
    if (!matches) return res.status(400).json({ message: 'Invalid code' });

    // Clear OTP
    client.otpCode = null;
    client.otpExpires = null;
    await client.save();

    const token = generateToken(client._id, 'client');
    res.json({ token, user: client.toPublicJSON(), role: 'client' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// ==================== THERAPIST AUTH ====================

// POST /api/auth/therapist/register
router.post('/therapist/register', async (req, res) => {
  try {
    const { email, password, name, phone, title, specializations, experience, bio, languages, pricing } = req.body;

    const exists = await Therapist.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered as therapist' });
    }

    const therapist = await Therapist.create({
      email,
      password,
      name,
      phone,
      title: title || 'Psychologist',
      specializations: specializations || [],
      experience: experience || 0,
      bio: bio || '',
      languages: languages || ['English'],
      pricing: pricing || { '30': 600, '50': 900 },
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: true },
      ],
    });

    const token = generateToken(therapist._id, 'therapist');
    res.status(201).json({
      token,
      user: therapist.toPublicJSON(),
      role: 'therapist'
    });
  } catch (error) {
    console.error('Therapist register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/therapist/login
router.post('/therapist/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const therapist = await Therapist.findOne({ email });

    if (!therapist) {
      return res.status(404).json({ message: 'This email is not registered as a therapist' });
    }
    if (!(await therapist.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = generateToken(therapist._id, 'therapist');
    res.json({
      token,
      user: therapist.toPublicJSON(),
      role: 'therapist'
    });
  } catch (error) {
    console.error('Therapist login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== CLIENT AUTH ====================

// POST /api/auth/client/register
router.post('/client/register', async (req, res) => {
  try {
    const { email, password, name, phone, therapyPreferences, referralCode } = req.body;

    const exists = await Client.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const client = await Client.create({
      email,
      password,
      name,
      phone,
      therapyPreferences: therapyPreferences || {},
    });

    // Handle referral if code provided
    if (referralCode) {
      try {
        const Referral = (await import('../models/Referral.js')).default;
        const referrer = await Client.findOne({ referralCode });
        if (referrer) {
          await Referral.create({
            referrerId: referrer._id,
            referralCode,
            referredEmail: email,
            referredClientId: client._id,
            status: 'completed',
          });
        }
      } catch (refErr) {
        console.error('Referral tracking error:', refErr.message);
      }
    }

    const token = generateToken(client._id, 'client');
    res.status(201).json({
      token,
      user: client.toPublicJSON(),
      role: 'client'
    });
  } catch (error) {
    console.error('Client register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/auth/client/login
router.post('/client/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await Client.findOne({ email });

    if (!client) {
      return res.status(404).json({ message: 'This email is not registered as a client' });
    }
    if (!(await client.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = generateToken(client._id, 'client');
    res.json({
      token,
      user: client.toPublicJSON(),
      role: 'client'
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ADMIN AUTH ====================

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ message: 'This email is not registered as an admin' });
    }
    if (!(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = generateToken(admin._id, 'admin');
    res.json({
      token,
      user: admin.toPublicJSON(),
      role: 'admin'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me  - get current user profile
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user, role: req.userRole });
});

// GET /api/auth/referrals/my — client's referrals
router.get('/referrals/my', protect, async (req, res) => {
  try {
    if (req.userRole !== 'client') return res.status(403).json({ message: 'Client only' });
    const Referral = (await import('../models/Referral.js')).default;
    const client = await Client.findById(req.userId).select('referralCode');
    const referrals = await Referral.find({ referrerId: req.userId })
      .populate('referredClientId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ referralCode: client?.referralCode || '', referrals });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
