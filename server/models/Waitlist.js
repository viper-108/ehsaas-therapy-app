import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['waiting', 'notified', 'expired'],
    default: 'waiting'
  },
}, { timestamps: true });

waitlistSchema.index({ therapistId: 1, date: 1 });
waitlistSchema.index({ clientId: 1 });

export default mongoose.model('Waitlist', waitlistSchema);
