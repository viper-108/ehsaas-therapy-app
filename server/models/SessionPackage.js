import mongoose from 'mongoose';

const sessionPackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  sessionCount: { type: Number, required: true },
  price: { type: Number, required: true },
  validityDays: { type: Number, default: 90 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('SessionPackage', sessionPackageSchema);
