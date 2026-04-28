import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const clientSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  therapyPreferences: {
    type: { type: String, default: '' },       // e.g. "Individual Therapy"
    concerns: [{ type: String }],               // e.g. ["Anxiety", "Depression"]
    preferredLanguage: { type: String, default: 'English' },
    description: { type: String, default: '' }  // free-text description of needs
  },
  // Emergency contact (used in case of crisis)
  emergencyContact: {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relationship: { type: String, default: '' },
  },
  // Service the client is currently looking for — picked at login/landing
  preferredServiceType: { type: String, enum: ['individual', 'couple', 'group', 'family', 'supervision', null], default: null },
  // Couples therapy profile (only used if preferredServiceType === 'couple')
  couplesProfile: {
    partnerEmail: { type: String, default: '' },
    partnerName: { type: String, default: '' },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    relationshipDuration: { type: String, default: '' },     // e.g. "5 years"
    relationshipType: { type: String, default: '' },          // e.g. "married", "dating"
    challengesFacing: { type: String, default: '' },
    goalsForTherapy: { type: String, default: '' },
    profileCompletedAt: { type: Date, default: null },
    isApprovedByAdmin: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    partnerInvitedAt: { type: Date, default: null },
  },
  stripeCustomerId: { type: String, default: '' },
  referralCode: { type: String, unique: true, sparse: true },
  // Behaviour tracking - auto-flagged by system
  cancellationCount: { type: Number, default: 0 },
  noShowCount: { type: Number, default: 0 },
  // Flags: set when thresholds exceeded
  flags: {
    highCancellations: { type: Boolean, default: false },
    highNoShows: { type: Boolean, default: false },
    frequentTherapistChanges: { type: Boolean, default: false },
  },
  // Password reset
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  // OTP login
  otpCode: { type: String, default: null },
  otpExpires: { type: Date, default: null },
}, { timestamps: true });

// Auto-generate referral code on creation
clientSchema.pre('save', async function(next) {
  if (!this.referralCode) {
    this.referralCode = 'EH' + this._id.toString().slice(-6).toUpperCase();
  }
  next();
});

clientSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

clientSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

clientSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('Client', clientSchema);
