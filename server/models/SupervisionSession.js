import mongoose from 'mongoose';

const supervisionParticipantSchema = new mongoose.Schema({
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
}, { _id: false });

const supervisionSessionSchema = new mongoose.Schema({
  type: { type: String, enum: ['individual', 'group'], required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' }, // for individual
  participants: [supervisionParticipantSchema], // for group
  date: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  duration: { type: Number, default: 0 },           // 50 or 90 (minutes) for individual
  amount: { type: Number, default: 0 },             // Indicative fee in INR for individual paid bookings
  topic: { type: String, required: true },
  status: {
    type: String,
    // pending_payment: booking created, awaiting PhonePe success.
    // scheduled: payment confirmed (or admin approved+scheduled, legacy flow).
    enum: ['requested', 'admin_approved', 'pending_payment', 'scheduled', 'completed', 'cancelled', 'rejected'],
    default: 'requested'
  },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  adminApproved: { type: Boolean, default: false },
  meetingLink: { type: String, default: '' },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

supervisionSessionSchema.index({ requesterId: 1 });
supervisionSessionSchema.index({ status: 1 });

export default mongoose.model('SupervisionSession', supervisionSessionSchema);
