import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// A single time chunk within a day, e.g. 09:00–12:00
const timeChunkSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "12:00"
}, { _id: false });

const availabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
  // Legacy single-range fields (kept for backwards compatibility with existing data)
  startTime: { type: String, default: '09:00' },
  endTime: { type: String, default: '18:00' },
  // New: array of multiple chunks per day. If `chunks` has entries, they take precedence over startTime/endTime.
  chunks: { type: [timeChunkSchema], default: [] },
  isAvailable: { type: Boolean, default: true },
  maxSessionsThisDay: { type: Number, default: null, min: 0, max: 20 },
}, { _id: false });

const therapistSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  title: { type: String, default: 'Psychologist' },
  phone: { type: String, trim: true },
  specializations: [{ type: String }],
  experience: { type: Number, default: 0 },
  bio: { type: String, default: '' },
  languages: [{ type: String }],
  image: { type: String, default: '' },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalSessions: { type: Number, default: 0 },
  // Pricing — Map of duration → max price (the public/displayed price)
  pricing: {
    type: Map,
    of: Number,
    default: { '30': 600, '50': 900 }
  },
  // Optional minimum price (per duration). Set by ADMIN after interview.
  // Visible to admin and the therapist only; never exposed in public listing.
  pricingMin: {
    type: Map,
    of: Number,
    default: {}
  },
  // Therapist opts in/out of "sliding scale" — i.e. willing to negotiate down to pricingMin
  slidingScaleAvailable: { type: Boolean, default: false },

  // ========== SERVICE TYPES & PRICING (NEW) ==========
  // What the therapist OFFERS — set during onboarding. Original ask, never displayed publicly after admin approval.
  servicesOffered: {
    type: [{
      type: { type: String, enum: ['individual', 'couple', 'group', 'family', 'supervision'], required: true },
      minPrice: { type: Number, required: true, min: 0 },
      maxPrice: { type: Number, required: true, min: 0 },
      _id: false,
    }],
    default: [],
  },
  // What ADMIN approved post-interview. THIS is the source of truth shown publicly.
  approvedServices: {
    type: [{
      type: { type: String, enum: ['individual', 'couple', 'group', 'family', 'supervision'], required: true },
      minPrice: { type: Number, required: true, min: 0 },
      maxPrice: { type: Number, required: true, min: 0 },
      // Therapist response after admin approves the service+price
      therapistAccepted: { type: Boolean, default: false },
      therapistRejected: { type: Boolean, default: false },
      acceptedAt: { type: Date, default: null },
      rejectedAt: { type: Date, default: null },
      approvedByAdminAt: { type: Date, default: Date.now },
      _id: false,
    }],
    default: [],
  },
  // True once admin has done the per-service review (i.e. approvedServices is locked in)
  servicesFinalized: { type: Boolean, default: false },
  availability: [availabilitySlotSchema],
  calendlyLink: { type: String, default: '' },
  isApproved: { type: Boolean, default: false },
  isOnboarded: { type: Boolean, default: false },
  onboardingStatus: {
    type: String,
    // Application lifecycle: not_started -> pending_approval -> interview_scheduled -> in_process -> approved | rejected
    enum: ['not_started', 'pending_approval', 'interview_scheduled', 'in_process', 'approved', 'rejected'],
    default: 'not_started'
  },
  rejectionReason: { type: String, default: '' },
  // Interview / application coordination by admin
  interviewLink: { type: String, default: '' },
  interviewScheduledAt: { type: Date, default: null },
  interviewNotes: { type: String, default: '' },
  stripeAccountId: { type: String, default: '' },
  totalEarnings: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  maxSessionsPerDay: { type: Number, default: 8, min: 1, max: 20 },
  resume: { type: String, default: '' },
  educationBackground: { type: String, default: '' },
  courses: [{ type: String }],
  highestEducation: { type: String, default: '' },
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified' },
  bankDetails: {
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
  },
  // Commission percentage the therapist receives (rest goes to Ehsaas)
  commissionPercent: { type: Number, default: 60, min: 0, max: 100 },
  // Therapist type: psychologist (default) or psychiatrist (can issue prescriptions)
  therapistType: { type: String, enum: ['psychologist', 'psychiatrist'], default: 'psychologist' },
  // Account status: 'active' shows publicly; 'past' soft-deleted, hidden from public/bookings
  accountStatus: { type: String, enum: ['active', 'past'], default: 'active' },
  deletedAt: { type: Date, default: null },
  // Password reset
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  // OTP login (mirror of Client)
  otpCode: { type: String, default: null },
  otpExpires: { type: Date, default: null },
}, { timestamps: true });

therapistSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

therapistSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

therapistSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  // Convert pricing Map to plain object
  if (obj.pricing instanceof Map) {
    obj.pricing = Object.fromEntries(obj.pricing);
  }
  if (obj.pricingMin instanceof Map) {
    obj.pricingMin = Object.fromEntries(obj.pricingMin);
  }
  // Strip therapist's original service ASKS — these should never be exposed publicly
  delete obj.servicesOffered;
  return obj;
};

export default mongoose.model('Therapist', therapistSchema);
