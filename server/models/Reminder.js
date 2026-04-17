import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  type: { type: String, enum: ['24h', '1h', '15min'], required: true },
  scheduledAt: { type: Date, required: true },
  sentAt: { type: Date },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
}, { timestamps: true });

reminderSchema.index({ scheduledAt: 1, status: 1 });
reminderSchema.index({ sessionId: 1, type: 1 }, { unique: true });

export default mongoose.model('Reminder', reminderSchema);
