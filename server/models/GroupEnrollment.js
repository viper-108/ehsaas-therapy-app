import mongoose from 'mongoose';

/**
 * GroupEnrollment — one row per (group, client) application.
 * Lifecycle:
 *   pending_review (admin + lead therapists must approve)
 *     -> approved (paid) -> enrolled
 *     -> waitlist (full at approval time)
 *     -> rejected (with optional referredToGroupId)
 *     -> cancelled (client opt-out before lock)
 */
const groupEnrollmentSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupTherapy', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },

  // Application form (expanded — see /group-therapy/:id/apply UI)
  application: {
    age: { type: Number, default: null },
    expectations: { type: String, default: '' },
    priorGroupExperience: { type: String, default: '' },        // "Have you done group therapy before? How was it?"
    inIndividualTherapy: { type: String, default: '' },          // "Are you currently in individual therapy?"
    individualTherapistName: { type: String, default: '' },      // optional — to detect dual relationship
    comfortableSharingFocus: { type: Boolean, default: false },  // FLAG question
    canCommitSchedule: { type: Boolean, default: false },        // FLAG
    crisisRiskNow: { type: Boolean, default: false },            // FLAG: harm to self/others
    languageComfortable: { type: Boolean, default: false },      // FLAG
    notesForFacilitator: { type: String, default: '' },
    safetyRequirements: { type: String, default: '' },           // "What would make this group feel safe for you?"
    agreedToGuidelines: { type: Boolean, default: false },
    relevantHistory: { type: String, default: '' },              // legacy
    reasonForJoining: { type: String, default: '' },             // legacy
  },

  // Auto-flags raised at submission time (admin/therapist sees these prominently)
  flags: {
    crisisRisk: { type: Boolean, default: false },
    languageMismatch: { type: Boolean, default: false },
    cantCommitSchedule: { type: Boolean, default: false },
    notComfortableSharing: { type: Boolean, default: false },
    dualRelationship: { type: Boolean, default: false },         // client is in 1:1 therapy with a lead therapist of this group
    underAgeRange: { type: Boolean, default: false },
  },

  status: {
    type: String,
    enum: ['pending_review', 'approved', 'enrolled', 'waitlist', 'rejected', 'cancelled', 'dropped'],
    default: 'pending_review'
  },

  adminApproved: { type: Boolean, default: false },
  adminApprovedAt: { type: Date, default: null },
  // Each lead therapist approves separately; client only enters group when ALL therapists + admin approve
  therapistApprovals: [{
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' },
    approved: { type: Boolean, default: false },
    decidedAt: { type: Date, default: null },
    _id: false,
  }],

  rejectionReason: { type: String, default: '' },
  referredToGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupTherapy', default: null },

  // Waitlist tracking
  joinedWaitlistAt: { type: Date, default: null },
  waitlistPosition: { type: Number, default: null },
  promotedFromWaitlistAt: { type: Date, default: null },

  // Payment (uses existing Payment system; this just flags status)
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded', 'partial_refund'], default: 'unpaid' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  paidAmount: { type: Number, default: 0 },
  refundedAmount: { type: Number, default: 0 },
  droppedAt: { type: Date, default: null },
  dropReason: { type: String, default: '' },

  // Per-session attendance ([{ sessionNumber, attended, markedAt }])
  attendance: [{
    sessionNumber: { type: Number, required: true },
    attended: { type: Boolean, default: false },
    markedAt: { type: Date, default: Date.now },
    _id: false,
  }],
}, { timestamps: true });

groupEnrollmentSchema.index({ groupId: 1, clientId: 1 }, { unique: true });
groupEnrollmentSchema.index({ groupId: 1, status: 1 });
groupEnrollmentSchema.index({ clientId: 1, status: 1 });

export default mongoose.model('GroupEnrollment', groupEnrollmentSchema);
