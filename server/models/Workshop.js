import mongoose from 'mongoose';

/**
 * Workshop — short, skill-based event. Lighter than group therapy:
 *   - one-time or short-lived (1-3 sessions max usually)
 *   - no individual screening — anyone can pay & join
 *   - no per-seat limit by default (capacity optional)
 *   - certificate of completion (if enabled)
 *
 * Lifecycle: pending_admin -> upcoming -> ongoing -> completed | rejected | cancelled
 */
const workshopSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },                 // short marketing description
  topic: { type: String, required: true },                    // primary topic
  subtopics: [{ type: String }],

  // Multiple session dates (workshop may span multiple sessions but is short-lived)
  sessionDates: [{ type: Date }],
  durationMinutes: { type: Number, default: 90 },             // each session

  learningOutcomes: [{ type: String }],                       // bullet points
  targetAudience: { type: String, default: '' },              // skill level, age, gender
  contraindications: { type: String, default: '' },           // optional
  planProcedure: { type: String, default: '' },               // session-by-session w/ rationale

  facilitatorTherapistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' }],

  brochureUrl: { type: String, default: '' },                 // optional marketing image

  mode: { type: String, enum: ['online', 'in-person', 'hybrid'], default: 'online' },
  language: { type: String, default: 'English' },
  pricePerParticipant: { type: Number, required: true, min: 0 },

  // Capacity is OPTIONAL for workshops (default: unlimited)
  capacity: { type: Number, default: null },

  certificateProvided: { type: Boolean, default: true },

  status: {
    type: String,
    enum: ['pending_admin', 'upcoming', 'ongoing', 'completed', 'rejected', 'cancelled'],
    default: 'pending_admin'
  },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },

  // Registration counts (live)
  registeredCount: { type: Number, default: 0 },

  // Optional post-workshop summary (filled by lead facilitator)
  sessionSummary: {
    attendanceCount: { type: Number, default: 0 },
    topicsCovered: { type: String, default: '' },
    keyTakeaways: { type: String, default: '' },
    activitiesConducted: { type: String, default: '' },
    participantEngagement: { type: String, enum: ['', 'high', 'medium', 'low'], default: '' },
    whatToImprove: { type: String, default: '' },
    learningOutcomesAchieved: { type: String, default: '' },     // y/n + why
    submittedAt: { type: Date, default: null },
  },
}, { timestamps: true });

workshopSchema.index({ status: 1 });
workshopSchema.index({ facilitatorTherapistIds: 1 });

export default mongoose.model('Workshop', workshopSchema);
