import mongoose from 'mongoose';

const workshopRegistrationSchema = new mongoose.Schema({
  workshopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workshop', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },

  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  paidAmount: { type: Number, default: 0 },

  // Marked when therapist takes attendance after workshop
  attended: { type: Boolean, default: false },

  // Post-workshop client feedback
  feedback: {
    rating: { type: Number, min: 1, max: 5, default: null },
    learnings: { type: String, default: '' },
    suggestions: { type: String, default: '' },
    wouldRecommend: { type: Boolean, default: null },
    submittedAt: { type: Date, default: null },
  },

  // Certificate details (issued automatically once feedback is submitted + attendance is true)
  certificateIssuedAt: { type: Date, default: null },
  certificateNumber: { type: String, default: '' },
}, { timestamps: true });

workshopRegistrationSchema.index({ workshopId: 1, clientId: 1 }, { unique: true });
workshopRegistrationSchema.index({ clientId: 1 });

export default mongoose.model('WorkshopRegistration', workshopRegistrationSchema);
