import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderRole: { type: String, enum: ['client', 'therapist'], required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  conversationKey: { type: String, required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ conversationKey: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, read: 1 });

// Helper to generate a consistent conversation key between two users
messageSchema.statics.getConversationKey = function(id1, id2) {
  return [id1.toString(), id2.toString()].sort().join('_');
};

export default mongoose.model('Message', messageSchema);
