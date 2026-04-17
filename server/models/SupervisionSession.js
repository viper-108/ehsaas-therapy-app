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
  topic: { type: String, required: true },
  status: {
    type: String,
    enum: ['requested', 'admin_approved', 'scheduled', 'completed', 'cancelled', 'rejected'],
    default: 'requested'
  },
  adminApproved: { type: Boolean, default: false },
  meetingLink: { type: String, default: '' },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

supervisionSessionSchema.index({ requesterId: 1 });
supervisionSessionSchema.index({ status: 1 });

export default mongoose.model('SupervisionSession', supervisionSessionSchema);
