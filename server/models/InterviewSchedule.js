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
  // If the therapist proposes a new date/time, admin sees it on their side
  // and can either accept (replacing scheduledDate/Time) or decline.
  rescheduleRequestedAt: { type: Date, default: null },
  rescheduleProposedDate: { type: Date, default: null },
  rescheduleProposedTime: { type: String, default: '' },
  rescheduleReason: { type: String, default: '' },
}, { timestamps: true });

interviewScheduleSchema.index({ therapistId: 1 });

export default mongoose.model('InterviewSchedule', interviewScheduleSchema);
