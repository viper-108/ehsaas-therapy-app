import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  psychiatristId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  date: { type: Date, default: Date.now },
  diagnosis: { type: String, default: '' },
  medications: [{
    name: { type: String, required: true },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' },
    notes: { type: String, default: '' },
  }],
  advice: { type: String, default: '' },
  fileUrl: { type: String, default: '' }, // optional uploaded PDF
  followUpDate: { type: Date, default: null },
}, { timestamps: true });

prescriptionSchema.index({ clientId: 1, createdAt: -1 });
prescriptionSchema.index({ psychiatristId: 1, createdAt: -1 });

export default mongoose.model('Prescription', prescriptionSchema);
