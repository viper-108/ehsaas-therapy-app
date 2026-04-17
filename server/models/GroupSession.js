import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const groupSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  adminCreatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  maxParticipants: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['open', 'full', 'completed', 'cancelled'],
    default: 'open'
  },
  participants: [participantSchema],
}, { timestamps: true });

groupSessionSchema.virtual('currentParticipants').get(function() {
  return this.participants.length;
});

groupSessionSchema.set('toJSON', { virtuals: true });
groupSessionSchema.set('toObject', { virtuals: true });

groupSessionSchema.index({ date: 1, status: 1 });

export default mongoose.model('GroupSession', groupSessionSchema);
