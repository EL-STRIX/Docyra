import { auditService } from '../services/auditService.js';

/**
 * Middleware generator for logging PHI-adjacent actions
 * @param {string} action - Action name (e.g., 'APPOINTMENT_CREATE', 'PROFILE_UPDATE')
 * @param {string} resourceType - Resource type (e.g., 'Appointment', 'DoctorProfile')
 */
export const auditLogger = (action, resourceType) => {
  return (req, res, next) => {
    // Capture details when response finishes
    res.on('finish', () => {
      // Only log successful operations or client operational actions (status < 400)
      if (res.statusCode < 400) {
        const actor = req.user || {};
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const resourceId = req.params?.id || req.body?.id || res.locals?.resourceId || null;

        // Non-blocking background log
        auditService.log({
          actorId: actor.id || null,
          actorEmail: actor.email || null,
          actorRole: actor.role || 'anonymous',
          action,
          resourceType,
          resourceId,
          ipAddress,
          userAgent,
          metadata: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
        });
      }
    });

    next();
  };
};

export default auditLogger;
