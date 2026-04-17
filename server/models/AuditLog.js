import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId },
  userRole: { type: String, default: '' },
  action: { type: String, required: true },
  resource: { type: String, default: '' },
  resourceId: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
