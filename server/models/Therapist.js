import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const availabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },   // "18:00"
  isAvailable: { type: Boolean, default: true },
  // Max number of sessions on this specific day (overrides therapist.maxSessionsPerDay if set)
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
  // Optional minimum price the therapist is willing to negotiate down to (per duration)
  // Visible only to admin; clients only see the `pricing` (max) value
  pricingMin: {
    type: Map,
    of: Number,
    default: {}
  },
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
  return obj;
};

export default mongoose.model('Therapist', therapistSchema);
