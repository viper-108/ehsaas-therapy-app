import mongoose from 'mongoose';

const progressEntrySchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  moodRating: { type: Number, required: true, min: 1, max: 10 },
  anxietyLevel: { type: Number, required: true, min: 1, max: 10 },
  overallProgress: { type: Number, required: true, min: 1, max: 10 },
  notes: { type: String, default: '' },
  date: { type: Date, required: true },
}, { timestamps: true });

progressEntrySchema.index({ clientId: 1, date: 1 });
progressEntrySchema.index({ sessionId: 1 }, { unique: true });

export default mongoose.model('ProgressEntry', progressEntrySchema);
