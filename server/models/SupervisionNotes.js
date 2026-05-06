import mongoose from 'mongoose';

/**
 * SupervisionNotes — notes a supervisor writes about a supervision session
 * (used for both individual and group supervision).
 */
const supervisionNotesSchema = new mongoose.Schema({
  // For INDIVIDUAL supervision: links to a Session
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  // For GROUP supervision: links to a SupervisionGroup + sessionNumber
  supervisionGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupervisionGroup', default: null },
  sessionNumber: { type: Number, default: null },

  supervisorTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  superviseeTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', default: null },  // for group, null

  // Note content
  casesDiscussed: { type: String, default: '' },
  issuesDiscussed: { type: String, default: '' },
  skillsTechniques: { type: String, default: '' },
  ethics: { type: String, default: '' },
  readingsAssigned: { type: String, default: '' },
  actionPlans: { type: String, default: '' },

  privateToSupervisor: { type: Boolean, default: false },  // if true, supervisee doesn't see it
}, { timestamps: true });

supervisionNotesSchema.index({ supervisorTherapistId: 1, createdAt: -1 });
supervisionNotesSchema.index({ superviseeTherapistId: 1, createdAt: -1 });

export default mongoose.model('SupervisionNotes', supervisionNotesSchema);
