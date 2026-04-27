import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['worksheet', 'article', 'exercise', 'video', 'other'], default: 'article' },
  content: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  // Visibility tiers:
  // - 'private'         => only this therapist can see (their personal library)
  // - 'all_therapists'  => visible to ALL therapists (peer-to-peer / central therapist library)
  // - 'all_clients'     => visible to ALL clients (central public client library)
  // - 'specific_clients'=> visible only to clients listed in sharedWith[]
  visibility: {
    type: String,
    enum: ['private', 'all_therapists', 'all_clients', 'specific_clients'],
    default: 'private'
  },
  // Legacy flag (kept for backwards compatibility — same as visibility='all_clients')
  isPublic: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  tags: [{ type: String }],
}, { timestamps: true });

resourceSchema.index({ therapistId: 1 });
resourceSchema.index({ visibility: 1 });
resourceSchema.index({ isPublic: 1 });

export default mongoose.model('Resource', resourceSchema);
