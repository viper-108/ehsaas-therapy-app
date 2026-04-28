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

  // Application form
  application: {
    age: { type: Number, default: null },
    reasonForJoining: { type: String, default: '' },
    expectations: { type: String, default: '' },
    relevantHistory: { type: String, default: '' },
    agreedToGroupRules: { type: Boolean, default: false },
  },

  status: {
    type: String,
    enum: ['pending_review', 'approved', 'enrolled', 'waitlist', 'rejected', 'cancelled'],
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
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  paidAmount: { type: Number, default: 0 },
}, { timestamps: true });

groupEnrollmentSchema.index({ groupId: 1, clientId: 1 }, { unique: true });
groupEnrollmentSchema.index({ groupId: 1, status: 1 });
groupEnrollmentSchema.index({ clientId: 1, status: 1 });

export default mongoose.model('GroupEnrollment', groupEnrollmentSchema);
