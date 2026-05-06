import mongoose from 'mongoose';

/**
 * GroupEffectivenessIndicator — fills the role of "session notes" for group therapy.
 * One row per (group, sessionNumber). Submitted by lead therapist after each group session.
 */
const groupEffectivenessSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupTherapy', required: true },
  sessionNumber: { type: Number, required: true, min: 1 },
  authorTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  sessionDate: { type: Date, default: Date.now },

  attendanceCount: { type: Number, default: 0 },
  topicCovered: { type: String, default: '' },
  goalForSession: { type: String, default: '' },
  goalAchieved: { type: String, default: '' },              // "did we meet that?"
  interventions: { type: String, default: '' },
  processingNotes: { type: String, default: '' },           // "how did the processing go?"
  groupDynamics: { type: String, default: '' },             // brief
  notableMoments: { type: String, default: '' },
  overallMood: { type: String, default: '' },               // free-text or low/med/high
  participationLevel: { type: String, enum: ['', 'low', 'medium', 'high'], default: '' },
  conflictsBiasesCountertransferences: { type: String, default: '' },
  crisisOccurred: { type: String, default: '' },            // any crisis details
  memberFeedbacks: { type: String, default: '' },
  selfReflection: { type: String, default: '' },
  questionsForSupervision: { type: String, default: '' },
}, { timestamps: true });

groupEffectivenessSchema.index({ groupId: 1, sessionNumber: 1 }, { unique: true });
groupEffectivenessSchema.index({ authorTherapistId: 1 });

export default mongoose.model('GroupEffectivenessIndicator', groupEffectivenessSchema);
