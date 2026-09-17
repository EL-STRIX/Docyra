const AppError = require('../utils/AppError');
const { ROLES, ERROR_CODES } = require('../config/constants');

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param {string[]} allowedRoles Array of allowed roles
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized(ERROR_CODES.UNAUTHORIZED, 'Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      AppError.forbidden(
        ERROR_CODES.FORBIDDEN,
        `Access denied. Required role: [${allowedRoles.join(', ')}], current role: ${req.user.role}`
      )
    );
  }

  next();
};

/**
 * Middleware to enforce clinic-scoping for Clinic Admins (R6.4, R6.5)
 * Ensures a Clinic Admin can NEVER access or mutate another clinic's data
 */
const scopeClinic = (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized(ERROR_CODES.UNAUTHORIZED, 'Authentication required'));
  }

  // Platform Admin has platform-wide access
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  // Clinic Admin must have a clinicId and is strictly scoped to it
  if (req.user.role === ROLES.CLINIC_ADMIN) {
    if (!req.user.clinicId) {
      return next(
        AppError.forbidden(
          ERROR_CODES.CLINIC_ACCESS_DENIED,
          'Clinic Admin account is not associated with any active clinic'
        )
      );
    }

    const userClinicId = req.user.clinicId.toString();

    // If client supplied a clinicId in params, query, or body, it MUST match the user's clinicId
    const requestedClinicId = req.params.clinicId || req.query.clinicId || req.body.clinicId;
    if (requestedClinicId && requestedClinicId.toString() !== userClinicId) {
      return next(
        AppError.forbidden(
          ERROR_CODES.CLINIC_ACCESS_DENIED,
          'Cross-clinic access violation: You cannot access or modify another clinic\'s data'
        )
      );
    }

    // Attach verified clinicId for controllers and services to use directly
    req.clinicId = req.user.clinicId;
    return next();
  }

  // Doctor role: if tied to a clinic, verify clinic affiliation
  if (req.user.role === ROLES.DOCTOR && req.user.clinicId) {
    req.clinicId = req.user.clinicId;
  }

  next();
};

module.exports = {
  requireRole,
  scopeClinic
};
