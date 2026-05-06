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
    // Partner linkage
    partnerEmail: { type: String, default: '' },
    partnerName: { type: String, default: '' },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    polyamorousNote: { type: String, default: '' },         // e.g. who is coming to therapy in poly relationships

    // Personal demographics
    dateOfBirth: { type: Date, default: null },
    age: { type: Number, default: null },
    phone: { type: String, default: '' },                    // preferably WhatsApp
    languagePreference: { type: String, default: '' },
    assignedSex: { type: String, default: '' },               // assigned at birth
    pronouns: { type: String, default: '' },
    occupation: { type: String, default: '' },
    highestEducation: { type: String, default: '' },

    // Health & lifestyle
    medicationsRegular: { type: String, default: '' },
    substancesUsed: [{ type: String }],                       // alcohol, cigarettes, vape, weed
    teaCoffeeFrequency: { type: String, default: '' },

    // Relationship details
    relationshipStatus: { type: String, default: '' },         // in-relationship, married, divorced...
    relationshipDuration: { type: String, default: '' },        // e.g. "5 years"
    relationshipType: { type: String, default: '' },            // legacy field - keep for backwards compat
    livingSituation: { type: String, default: '' },
    children: [{                                                // optional list
      name: { type: String, default: '' },
      age: { type: Number, default: null },
      gender: { type: String, default: '' },
      _id: false,
    }],

    // Concerns & expectations
    primaryConcerns: { type: String, default: '' },             // pertaining to the relationship
    expectationsFutureRelationship: { type: String, default: '' },
    expectationsTherapyGoals: { type: String, default: '' },
    challengesFacing: { type: String, default: '' },             // legacy — keep
    goalsForTherapy: { type: String, default: '' },              // legacy — keep

    // Health diagnoses
    selfDiagnoses: { type: String, default: '' },                // medical/mental health (self)
    partnerDiagnoses: { type: String, default: '' },             // perceived diagnoses of partner

    // Intimacy & conflict (1-10 ratings, conflict prose)
    emotionalIntimacyRating: { type: Number, min: 1, max: 10, default: null },
    physicalIntimacyRating: { type: Number, min: 1, max: 10, default: null },
    selfHandlesConflict: { type: String, default: '' },
    partnerHandlesConflict: { type: String, default: '' },

    // Connection & admiration
    admireInPartner: { type: String, default: '' },
    partnerAdmiresInMe: { type: String, default: '' },
    funTogether: { type: String, default: '' },

    // Source
    heardAboutEhsaasFrom: { type: String, default: '' },

    // Status
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
