import mongoose from 'mongoose';

/**
 * ChatGroup — a multi-participant conversation owned by a therapist.
 * Members include the owner therapist + a list of clients (must be the owner's clients).
 */
const chatGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  ownerTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  // Each member: { userId, role }
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['therapist', 'client', 'admin'], required: true },
    addedAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

chatGroupSchema.index({ ownerTherapistId: 1 });
chatGroupSchema.index({ 'members.userId': 1 });

export default mongoose.model('ChatGroup', chatGroupSchema);
