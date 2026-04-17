import AuditLog from '../models/AuditLog.js';

export const logAudit = async (req, action, resource, resourceId, details) => {
  try {
    await AuditLog.create({
      userId: req?.userId || null,
      userRole: req?.userRole || '',
      action,
      resource,
      resourceId: resourceId?.toString() || '',
      details: details || {},
      ip: req?.ip || req?.connection?.remoteAddress || '',
    });
  } catch (err) {
    console.error('[AUDIT] Log error:', err.message);
  }
};
