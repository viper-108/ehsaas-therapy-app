import mongoose from 'mongoose';

const trainingRegistrationSchema = new mongoose.Schema({
  trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram', required: true },
  // Trainees can be either Clients or Therapists (training programs target both)
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userRole: { type: String, enum: ['client', 'therapist'], required: true },

  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  paidAmount: { type: Number, default: 0 },

  attended: { type: Boolean, default: false },
  certificateIssuedAt: { type: Date, default: null },
  certificateNumber: { type: String, default: '' },
}, { timestamps: true });

trainingRegistrationSchema.index({ trainingId: 1, userId: 1 }, { unique: true });
trainingRegistrationSchema.index({ userId: 1 });

export default mongoose.model('TrainingRegistration', trainingRegistrationSchema);
