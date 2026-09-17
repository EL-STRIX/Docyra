const auditService = require('../services/auditService');

/**
 * Middleware to record audit log on PHI-adjacent routes
 * @param {string} action Description of action, e.g. 'APPOINTMENT_READ'
 * @param {string} targetType E.g. 'Appointment', 'User'
 */
const auditLogger = (action, targetType = 'Resource') => (req, res, next) => {
  // Capture response finish to log accurately
  res.on('finish', () => {
    // Only log if request was successful or authenticated
    if (res.statusCode < 400 && req.user) {
      const targetId = req.params.id || req.body?.appointmentId || req.body?.slotId || req.user._id;
      auditService.log({
        actorId: req.user._id,
        actorRole: req.user.role,
        action,
        targetType,
        targetId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        metadata: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode
        }
      });
    }
  });

  next();
};

module.exports = auditLogger;
