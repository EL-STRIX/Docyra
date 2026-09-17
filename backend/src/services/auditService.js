const { AuditLog } = require('../models');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Record a compliance audit log entry (R6.3, PRD Section 6)
   */
  async log({
    actorId = null,
    actorRole = 'anonymous',
    action,
    targetType,
    targetId,
    ipAddress = '',
    userAgent = '',
    metadata = {}
  }) {
    try {
      const logEntry = await AuditLog.create({
        actorId,
        actorRole,
        action,
        targetType,
        targetId: targetId ? targetId.toString() : 'N/A',
        ipAddress,
        userAgent,
        metadata,
        timestamp: new Date()
      });
      return logEntry;
    } catch (err) {
      logger.error(`❌ [AuditService] Failed to write audit log: ${err.message}`);
      return null;
    }
  }

  /**
   * Query audit logs with filters & pagination (Admin only)
   */
  async getLogs({ page = 1, limit = 20, actorId, action, targetType, startDate, endDate } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (actorId) query.actorId = actorId;
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }
}

module.exports = new AuditService();
