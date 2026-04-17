import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  excerpt: { type: String, default: '' },
  content: { type: String, required: true },
  author: { type: String, required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  category: { type: String, default: 'Mental Health' },
  tags: [{ type: String }],
  image: { type: String, default: '' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
}, { timestamps: true });

blogPostSchema.index({ isPublished: 1, publishedAt: -1 });
blogPostSchema.index({ therapistId: 1 });

export default mongoose.model('BlogPost', blogPostSchema);
