import mongoose from 'mongoose';

/**
 * TrainingProgram — multi-session training course (heavier than workshop, lighter than supervision).
 *
 * Lifecycle: pending_admin → upcoming → ongoing → completed | rejected | cancelled
 */
const trainingProgramSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  about: { type: String, default: '' },                          // longer description for discovery page
  outcomes: { type: String, default: '' },                       // goals/outcomes
  targetAudience: { type: String, default: '' },                 // "who is it for"

  // Multiple facilitators with detail (admins see this list with all 3 details)
  facilitators: [{
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' },
    name: { type: String, default: '' },
    credentials: { type: String, default: '' },
    experience: { type: String, default: '' },                  // free-text e.g. "12 yrs in CBT"
    _id: false,
  }],

  // Schedule
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  totalDurationHours: { type: Number, default: 0 },             // total program hours
  sessionDates: [{ type: Date }],                                // optional list of session dates
  sessionTime: { type: String, default: '' },                   // e.g. "Saturdays 10am-1pm"
  frequency: { type: String, default: '' },                     // "Weekly / Bi-weekly"
  totalSessions: { type: Number, default: 1 },
  durationMinutes: { type: Number, default: 90 },               // each session

  // Curriculum
  syllabus: { type: String, default: '' },                       // multi-line text
  syllabusBrochureUrl: { type: String, default: '' },           // PDF/image link

  // Commitments (for admin review)
  facilitatorCommitmentHours: { type: Number, default: 0 },
  traineeCommitmentHours: { type: Number, default: 0 },

  // Logistics
  language: { type: String, default: 'English' },
  mode: { type: String, enum: ['online', 'in-person', 'hybrid'], default: 'online' },

  // Pricing
  pricePerTrainee: { type: Number, required: true, min: 0 },
  capacity: { type: Number, default: null },                    // optional cap

  certificateProvided: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ['pending_admin', 'upcoming', 'ongoing', 'completed', 'rejected', 'cancelled'],
    default: 'pending_admin'
  },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },

  // Live counts
  registeredCount: { type: Number, default: 0 },
}, { timestamps: true });

trainingProgramSchema.index({ status: 1 });
trainingProgramSchema.index({ 'facilitators.therapistId': 1 });

export default mongoose.model('TrainingProgram', trainingProgramSchema);
