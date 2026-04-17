import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, { timestamps: true });

reviewSchema.index({ therapistId: 1 });
reviewSchema.index({ clientId: 1 });

export default mongoose.model('Review', reviewSchema);
