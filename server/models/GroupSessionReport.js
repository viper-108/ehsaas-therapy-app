import mongoose from 'mongoose';

/**
 * GroupSessionReport — therapist's per-session "effectiveness indicators" report.
 * Used in place of individual session notes for group sessions.
 */
const groupSessionReportSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupTherapy', required: true },
  sessionNumber: { type: Number, required: true },
  sessionDate: { type: Date, required: true },
  authorTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },

  // Indicators
  topic: { type: String, default: '' },
  goalForSession: { type: String, default: '' },
  goalMet: { type: String, default: '' },                   // "did we meet that?"
  interventions: { type: String, default: '' },
  processingNotes: { type: String, default: '' },           // "How did processing go?"
  groupDynamics: { type: String, default: '' },             // brief
  notableMoments: { type: String, default: '' },
  overallMood: { type: String, default: '' },               // "calm / energetic / heavy"
  overallParticipation: { type: String, default: '' },      // "low / moderate / high"
  conflictsBiasesCountertransference: { type: String, default: '' },
  crisisEvents: { type: String, default: '' },
  memberFeedback: { type: String, default: '' },
  selfReflection: { type: String, default: '' },
  questionsForSupervision: { type: String, default: '' },
}, { timestamps: true });

groupSessionReportSchema.index({ groupId: 1, sessionNumber: 1 });

export default mongoose.model('GroupSessionReport', groupSessionReportSchema);
