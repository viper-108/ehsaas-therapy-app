import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  // Group enrollment payment (alternative to sessionId)
  groupEnrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupEnrollment', default: null },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'inr' },
  stripePaymentIntentId: { type: String, default: '' },
  stripeSessionId: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: { type: String, default: 'stripe' },
  invoiceNumber: { type: String, default: '' },
  discountCode: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  // Recurring/multi-session payments — when one charge covers multiple sessions
  recurringGroupId: { type: String, default: null },
  sessionsCovered: { type: Number, default: 1 },
}, { timestamps: true });

paymentSchema.index({ clientId: 1 });
paymentSchema.index({ therapistId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

export default mongoose.model('Payment', paymentSchema);
