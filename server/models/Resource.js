import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['worksheet', 'article', 'exercise', 'video', 'other'], default: 'article' },
  content: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  tags: [{ type: String }],
}, { timestamps: true });

resourceSchema.index({ therapistId: 1 });
resourceSchema.index({ isPublic: 1 });

export default mongoose.model('Resource', resourceSchema);
