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
  //
  // `minPrice` / `maxPrice` are the overall band for the service (used by
  //   single-duration services like family / group, and as a rollup for the
  //   multi-duration ones).
  // `durationPricing` carries the per-duration band. The supported durations
  //   per service type are fixed in the onboarding UI:
  //     individual  → 30, 50
  //     couple      → 50, 90
  //     supervision → 50, 90
  //     family      → (no durations — uses top-level minPrice/maxPrice)
  //     group       → (no durations — uses top-level minPrice/maxPrice)
  servicesOffered: {
    type: [{
      type: { type: String, enum: ['individual', 'couple', 'group', 'family', 'supervision'], required: true },
      minPrice: { type: Number, required: true, min: 0 },
      maxPrice: { type: Number, required: true, min: 0 },
      durationPricing: {
        type: [{
          duration: { type: Number, required: true, min: 1 },
          minPrice: { type: Number, required: true, min: 0 },
          maxPrice: { type: Number, required: true, min: 0 },
          _id: false,
        }],
        default: [],
      },
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
      durationPricing: {
        type: [{
          duration: { type: Number, required: true, min: 1 },
          minPrice: { type: Number, required: true, min: 0 },
          maxPrice: { type: Number, required: true, min: 0 },
          _id: false,
        }],
        default: [],
      },
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
  // Denormalised flat list of services this therapist is currently open
  // for. Always derived from approvedServices (only entries where the
  // therapist has accepted are listed). Kept as its own field so client-
  // facing filters are simple `{ offeredServiceTypes: <type> }` queries
  // and so the directory can show a quick "offers: X, Y, Z" chip without
  // sub-document parsing. Maintained automatically by the pre-save hook
  // — never set this directly, edit approvedServices instead.
  offeredServiceTypes: {
    type: [{ type: String, enum: ['individual', 'couple', 'group', 'family', 'supervision'] }],
    default: [],
    index: true,
  },
  // True once admin has done the per-service review (i.e. approvedServices is locked in)
  servicesFinalized: { type: Boolean, default: false },
  // Set when an existing approved therapist requests to add/remove services.
  // Admin sees these in their Pending Approvals tab and can approve/reject.
  servicesPendingReview: { type: Boolean, default: false },
  servicesPendingReviewAt: { type: Date, default: null },
  // Pending change requests — array of {type, action: 'add'|'remove', minPrice, maxPrice, note}
  pendingServiceChanges: {
    type: [{
      type: { type: String, enum: ['individual', 'couple', 'group', 'family', 'supervision'], required: true },
      action: { type: String, enum: ['add', 'remove'], required: true },
      minPrice: { type: Number, default: 0 },
      maxPrice: { type: Number, default: 0 },
      note: { type: String, default: '' },
      requestedAt: { type: Date, default: Date.now },
      _id: false,
    }],
    default: [],
  },

  // ========== SUPERVISION ==========
  // 1) Therapist offering SUPERVISION — applies via supervisorProfile.
  //    Independent from the 'supervision' service in approvedServices —
  //    the latter must also be approved+accepted for a supervisor to be listed publicly.
  supervisorProfile: {
    isApplied: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    appliedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    // Supervisor intake details
    therapyExperienceYears: { type: Number, default: 0 },
    supervisionExperienceYears: { type: Number, default: 0 },
    audience: { type: String, default: '' },          // "students, early-career therapists..."
    focusBio: { type: String, default: '' },          // "case discussion, ethics..."
    approach: { type: String, default: '' },
    durationOptions: [{ type: Number }],              // e.g. [50, 90]
    individualPrice50: { type: Number, default: 0 },
    individualPrice90: { type: Number, default: 0 },
    openTo: { type: String, enum: ['individual', 'group', 'both', ''], default: '' },
  },

  // 2) Therapist requesting SUPERVISION (supervisee) — applies via superviseeProfile.
  superviseeProfile: {
    isApplied: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    appliedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    // Supervisee intake details
    experienceLevelHours: { type: Number, default: 0 },
    currentCaseload: { type: Number, default: 0 },
    goalsExpectations: { type: String, default: '' },
    modalities: { type: String, default: '' },        // approaches/modalities
    consentToGuidelines: { type: Boolean, default: false },
  },
  availability: [availabilitySlotSchema],
  calendlyLink: { type: String, default: '' },
  isApproved: { type: Boolean, default: false },
  isOnboarded: { type: Boolean, default: false },
  onboardingStatus: {
    type: String,
    // Application lifecycle:
    //   not_started -> pending_approval -> interview_scheduled -> in_process -> approved | rejected
    // `revoked` is a separate terminal-ish state set when admin revokes an
    // already-approved therapist. Distinguishing it from 'rejected' lets
    // the dashboard show the right banner + enforce a 30-day reapply
    // cooldown (revokedAt + 30d must be in the past before they can
    // submit /reapply again).
    enum: ['not_started', 'pending_approval', 'interview_scheduled', 'in_process', 'approved', 'rejected', 'revoked'],
    default: 'not_started'
  },
  rejectionReason: { type: String, default: '' },
  rejectedAt: { type: Date, default: null },
  // Set when admin clicks "Revoke approval" on a previously-approved
  // therapist. Used by the 30-day reapply lock.
  revokedAt: { type: Date, default: null },
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
  // Personal — captured at onboarding, editable later. Pronouns is a fixed
  // enum (free-text "other" handled in UI via the Other option). Hours-
  // per-week is a coarse band, not exact hours, so it stays a string.
  pronouns: {
    type: String,
    enum: ['', 'she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'other', 'prefer-not-to-say'],
    default: '',
  },
  hoursPerWeek: {
    type: String,
    enum: ['', '0-5', '6-10', '11-20', '21-30', '30+'],
    default: '',
  },
  // Role the therapist is applying for. Drives admin's downstream
  // expectations (RCI registration, training requirements, etc.).
  applyingRole: {
    type: String,
    enum: [
      '',
      'trainee',          // Trainee therapist (0–350 counselling hours)
      'junior',           // Junior therapist (350–1500 hours)
      'mid-level',        // Mid-level therapist (1500–4000 hours)
      'senior',           // Senior therapist (4000+ hours)
      'clinical',         // Clinical psychologist (RCI registered)
      'psychiatrist',     // Psychiatrist with MD
    ],
    default: '',
  },
  // Pending profile edits — when an APPROVED therapist edits their
  // profile, the proposed values land here and admin must accept/reject
  // before they go live on the public-facing record. While pending the
  // therapist sees a "pending admin review" banner; when accepted, the
  // values are flushed onto the main fields. Set on therapists who are
  // not yet approved is unused (their edits go straight onto the
  // top-level fields during onboarding).
  pendingProfileChanges: {
    type: {
      changes: { type: mongoose.Schema.Types.Mixed, default: {} },
      submittedAt: { type: Date, default: null },
      adminNote: { type: String, default: '' },
    },
    default: () => ({}),
  },
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
  // Keep offeredServiceTypes in sync with approvedServices on every save.
  // Source of truth = approvedServices entries with therapistAccepted=true.
  if (this.isModified('approvedServices') || this.isNew) {
    const accepted = (this.approvedServices || [])
      .filter(s => s && s.therapistAccepted)
      .map(s => s.type);
    // Dedup, preserve order
    this.offeredServiceTypes = [...new Set(accepted)];
  }
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// findOneAndUpdate paths (e.g. service accept/reject endpoints) skip the
// pre('save') hook. Mirror the same offeredServiceTypes derivation here so
// the field stays consistent regardless of how approvedServices was changed.
therapistSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;
  if ($set && Array.isArray($set.approvedServices)) {
    const accepted = $set.approvedServices
      .filter(s => s && s.therapistAccepted)
      .map(s => s.type);
    if (update.$set) update.$set.offeredServiceTypes = [...new Set(accepted)];
    else update.offeredServiceTypes = [...new Set(accepted)];
    this.setUpdate(update);
  }
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
