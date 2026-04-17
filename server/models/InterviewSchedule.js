import mongoose from 'mongoose';

const interviewScheduleSchema = new mongoose.Schema({
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  meetingLink: { type: String, required: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

interviewScheduleSchema.index({ therapistId: 1 });

export default mongoose.model('InterviewSchedule', interviewScheduleSchema);
