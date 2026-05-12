import mongoose from 'mongoose';

const interviewScheduleSchema = new mongoose.Schema({
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  status: {
    type: String,
    // scheduled  → awaiting interview
    // completed  → admin approved the therapist after the interview
    // rejected   → admin rejected the therapist after the interview
    // cancelled  → admin scrapped this slot, can be re-scheduled
    enum: ['scheduled', 'completed', 'cancelled', 'rejected'],
    default: 'scheduled'
  },
  meetingLink: { type: String, required: true },
  notes: { type: String, default: '' },
  // Set when admin makes a terminal decision on the interview (approve /
  // reject / cancel). Lets the therapist dashboard render "decided on …".
  decidedAt: { type: Date, default: null },
  // Reason / note attached by admin at decision time. Shown to therapist
  // verbatim so they understand what happened.
  decisionNote: { type: String, default: '' },
  // If the therapist proposes a new date/time, admin sees it on their side
  // and can either accept (replacing scheduledDate/Time) or decline.
  rescheduleRequestedAt: { type: Date, default: null },
  rescheduleProposedDate: { type: Date, default: null },
  rescheduleProposedTime: { type: String, default: '' },
  rescheduleReason: { type: String, default: '' },
}, { timestamps: true });

interviewScheduleSchema.index({ therapistId: 1 });

export default mongoose.model('InterviewSchedule', interviewScheduleSchema);
