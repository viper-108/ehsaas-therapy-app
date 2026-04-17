import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userRole: { type: String, enum: ['client', 'therapist', 'admin'], required: true },
  type: { type: String, required: true }, // session_booked, session_cancelled, message, approval, review, reminder, intro_call, etc.
  title: { type: String, required: true },
  body: { type: String, default: '' },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Static helper to create a notification
notificationSchema.statics.notify = async function(userId, userRole, type, title, body, link) {
  return this.create({ userId, userRole, type, title, body, link });
};

export default mongoose.model('Notification', notificationSchema);
