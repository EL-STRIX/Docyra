const auditService = require('../services/auditService');
const asyncHandler = require('../utils/asyncHandler');

const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.getLogs(req.query);
  res.status(200).json({
    success: true,
    data: result.logs,
    meta: result.meta
  });
});

module.exports = {
  getAuditLogs
};
