import mongoose from 'mongoose';
import { AuditLog } from '../models/index.js';
import logger from '../utils/logger.js';

class AuditService {
  /**
   * Log an audit event (Non-blocking async write)
   */
  async log({
    actorId = null,
    actorEmail = null,
    actorRole = 'anonymous',
    action,
    resourceType,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    metadata = {},
  }) {
    try {
      // Create audit log record
      await AuditLog.create({
        actorId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? new mongoose.Types.ObjectId(actorId) : null,
        actorEmail,
        actorRole,
        action,
        resourceType,
        resourceId: resourceId ? resourceId.toString() : null,
        ipAddress,
        userAgent,
        metadata,
        timestamp: new Date(),
      });
    } catch (err) {
      // Audit log write failure should not fail the user transaction, but must be logged to Winston
      logger.error(`Failed to record audit log: ${err.message}`, { action, resourceType, resourceId });
    }
  }

  /**
   * Platform Admin: Query searchable, paginated audit logs
   */
  async getAuditLogs({
    page = 1,
    limit = 20,
    actorId,
    actorEmail,
    action,
    resourceType,
    dateFrom,
    dateTo,
  }) {
    const query = {};

    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      query.actorId = new mongoose.Types.ObjectId(actorId);
    }

    if (actorEmail) {
      query.actorEmail = { $regex: actorEmail, $options: 'i' };
    }

    if (action) {
      query.action = action;
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) query.timestamp.$lte = new Date(dateTo);
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}

export const auditService = new AuditService();
export default auditService;
