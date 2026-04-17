import mongoose from 'mongoose';

const clientPackageSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'SessionPackage', required: true },
  sessionsRemaining: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
}, { timestamps: true });

clientPackageSchema.index({ clientId: 1 });

export default mongoose.model('ClientPackage', clientPackageSchema);
