import { auditService } from '../services/auditService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Platform Admin: Get audit logs with search and pagination
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, actorId, actorEmail, action, resourceType, dateFrom, dateTo } = req.query;

  const result = await auditService.getAuditLogs({
    page,
    limit,
    actorId,
    actorEmail,
    action,
    resourceType,
    dateFrom,
    dateTo,
  });

  res.status(200).json({
    success: true,
    data: result.logs,
    meta: result.meta,
  });
});

export default {
  getAuditLogs,
};
