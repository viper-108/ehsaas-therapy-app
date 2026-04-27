import mongoose from 'mongoose';

const sessionNotesSchema = new mongoose.Schema({
  clientMood: { type: String, default: '' },
  keyTopicsDiscussed: { type: String, default: '' },
  importantNotes: { type: String, default: '' },
  interventionsOrSkillsUsed: { type: String, default: '' },
  plannedAgreedTasks: { type: String, default: '' },
  readingsOrSupervisionQuestions: { type: String, default: '' },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },  // "14:00"
  endTime: { type: String, required: true },     // "15:00"
  duration: { type: Number, required: true },    // in minutes: 30, 50, 60
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  notes: { type: sessionNotesSchema, default: () => ({}) },
  sessionType: {
    type: String,
    enum: ['individual', 'couple', 'group'],
    default: 'individual'
  },
  recurringGroupId: { type: String, default: '' },
  isRecurring: { type: Boolean, default: false },
  reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
  calendarSent: { type: Boolean, default: false },
  additionalClients: [{
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  }],
  feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeedbackSurvey' },
  progressId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgressEntry' },
  noShowEmailSent: { type: Boolean, default: false },
  // Payment status: unpaid (booking created without payment), paid (charge succeeded), refunded (cancelled with credit available)
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  // Cancellation tracking
  cancelledBy: { type: String, enum: [null, 'client', 'therapist', 'admin'], default: null },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true });

// Index for efficient queries
sessionSchema.index({ therapistId: 1, date: 1 });
sessionSchema.index({ clientId: 1, date: 1 });
sessionSchema.index({ status: 1 });

export default mongoose.model('Session', sessionSchema);
