import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  blockerRole: { type: String, enum: ['client', 'therapist'], required: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, required: true },
  blockedRole: { type: String, enum: ['client', 'therapist'], required: true },
  reason: { type: String, default: '' },
}, { timestamps: true });

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
blockSchema.index({ blockedId: 1 });

export default mongoose.model('Block', blockSchema);
