import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderRole: { type: String, enum: ['client', 'therapist', 'admin'], required: true },
  // For 1:1 messages, set to the other user. For group messages, leave null.
  receiverId: { type: mongoose.Schema.Types.ObjectId, default: null },
  conversationKey: { type: String, required: true }, // 1:1: sorted IDs joined; group: 'group_<groupId>'
  // For group messages — references ChatGroup
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', default: null },
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
