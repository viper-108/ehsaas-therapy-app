import mongoose from 'mongoose';

const relationshipSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  status: { type: String, enum: ['active', 'past'], default: 'active' },
  // When relationship started (first session booked)
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  // For transfers: the new therapist this client moved to
  transferredToTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', default: null },
  transferReason: { type: String, default: '' },
  transferredAt: { type: Date, default: null },
  // For new active relationship: the previous therapist they came from (lineage)
  transferredFromTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', default: null },
}, { timestamps: true });

// One active relationship per (client, therapist) pair
relationshipSchema.index({ clientId: 1, therapistId: 1 }, { unique: true });
relationshipSchema.index({ clientId: 1, status: 1 });
relationshipSchema.index({ therapistId: 1, status: 1 });

export default mongoose.model('ClientTherapistRelationship', relationshipSchema);
