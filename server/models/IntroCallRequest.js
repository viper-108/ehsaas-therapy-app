import mongoose from 'mongoose';

const introCallRequestSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  clientName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  reasonForTherapy: { type: String, required: true },
  whatLookingFor: { type: String, required: true },
  preferredDateTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'rejected'],
    default: 'pending'
  },
}, { timestamps: true });

introCallRequestSchema.index({ therapistId: 1, status: 1 });
introCallRequestSchema.index({ clientId: 1 });

export default mongoose.model('IntroCallRequest', introCallRequestSchema);
