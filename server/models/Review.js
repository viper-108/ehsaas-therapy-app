import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  // For therapist reviews — therapistId is set; for ehsaas (platform) reviews — null
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', default: null },
  // For session-bound therapist reviews; null for general/ehsaas reviews
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  reviewType: { type: String, enum: ['therapist', 'ehsaas'], default: 'therapist' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  // Admin moderation
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  rejectionReason: { type: String, default: '' },
}, { timestamps: true });

// Unique session-review pair only when sessionId is set
reviewSchema.index({ sessionId: 1 }, { unique: true, partialFilterExpression: { sessionId: { $type: 'objectId' } } });
reviewSchema.index({ therapistId: 1 });
reviewSchema.index({ clientId: 1 });
reviewSchema.index({ approvalStatus: 1 });
reviewSchema.index({ reviewType: 1 });

export default mongoose.model('Review', reviewSchema);
