import mongoose from 'mongoose';

/**
 * Price Negotiation lifecycle:
 *
 *  invited            → therapist or admin enables negotiation for a specific client
 *  proposed           → client submits a proposed price (must be in [min, max])
 *  partially_approved → one of {therapist, admin} has approved
 *  approved           → both therapist AND admin approved → client now pays the proposed price
 *  rejected           → either party rejected (with reason)
 *  cancelled          → enabler/admin cancelled the negotiation
 *
 * Only one ACTIVE negotiation per (client, therapist, duration) tuple
 * (active = invited / proposed / partially_approved / approved).
 */
const priceNegotiationSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  duration: { type: String, required: true }, // e.g. '30' or '50'
  // Anchor prices captured at the time negotiation was enabled
  originalPrice: { type: Number, required: true }, // therapist.pricing[duration] (max)
  minPrice: { type: Number, required: true },      // therapist.pricingMin[duration]
  // Client's proposed price
  proposedPrice: { type: Number, default: null },

  status: {
    type: String,
    enum: ['invited', 'proposed', 'partially_approved', 'approved', 'rejected', 'cancelled'],
    default: 'invited'
  },

  // Who enabled it (therapist or admin)
  enabledBy: { type: String, enum: ['therapist', 'admin'], required: true },
  enabledByUserId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Approvals — both must be true to activate
  therapistApproved: { type: Boolean, default: false },
  adminApproved: { type: Boolean, default: false },
  therapistApprovedAt: { type: Date, default: null },
  adminApprovedAt: { type: Date, default: null },

  rejectionReason: { type: String, default: '' },
  rejectedBy: { type: String, enum: [null, 'therapist', 'admin', 'client'], default: null },

  // When all approvals collected
  approvedAt: { type: Date, default: null },
}, { timestamps: true });

priceNegotiationSchema.index({ clientId: 1, therapistId: 1, duration: 1, status: 1 });
priceNegotiationSchema.index({ therapistId: 1, status: 1 });
priceNegotiationSchema.index({ status: 1 });

export default mongoose.model('PriceNegotiation', priceNegotiationSchema);
