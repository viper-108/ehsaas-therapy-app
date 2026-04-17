import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  amount: { type: Number, required: true },
  period: { type: String, required: true }, // "2026-04" format
  status: { type: String, enum: ['pending', 'processing', 'completed'], default: 'pending' },
  bankDetails: {
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
  },
  transactionRef: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

payoutSchema.index({ therapistId: 1, period: 1 });

export default mongoose.model('Payout', payoutSchema);
