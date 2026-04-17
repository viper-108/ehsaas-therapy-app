import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  referralCode: { type: String, required: true },
  referredEmail: { type: String, default: '' },
  referredClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { timestamps: true });

referralSchema.index({ referralCode: 1 });
referralSchema.index({ referrerId: 1 });

export default mongoose.model('Referral', referralSchema);
