import { ROLES, ERROR_CODES } from '../config/constants.js';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError.js';

/**
 * Middleware: Require one or more specific roles
 * @param {string|string[]} roles
 */
export const requireRole = (...roles) => {
  const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', ERROR_CODES.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: requires one of [${allowedRoles.join(', ')}] role`,
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    next();
  };
};

/**
 * Middleware: Enforce clinic data scoping (Hard Rule R6.5)
 * - Platform Admin has global visibility across all clinics
 * - Clinic Admin is strictly bound to req.user.clinicId from verified JWT
 * - Prevents clinic data leakage even if a forged clinicId is passed in body/query/params
 */
export const enforceClinicScope = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required', ERROR_CODES.UNAUTHORIZED));
  }

  // Platform Admin has platform-wide access
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  // Clinic Admin MUST have a clinicId
  if (req.user.role === ROLES.CLINIC_ADMIN) {
    if (!req.user.clinicId) {
      return next(
        new ForbiddenError('Clinic Admin account has no associated clinic', ERROR_CODES.FORBIDDEN)
      );
    }

    // Check if client tried to access/modify a different clinic via URL params
    if (req.params.clinicId && req.params.clinicId.toString() !== req.user.clinicId.toString()) {
      return next(
        new ForbiddenError(
          'Access denied: You cannot access or modify resources of another clinic',
          ERROR_CODES.FORBIDDEN
        )
      );
    }

    // Force clinicId in query and body from the verified JWT (never trust client payload)
    if (req.query) {
      req.query.clinicId = req.user.clinicId.toString();
    }
    if (req.body && typeof req.body === 'object') {
      req.body.clinicId = req.user.clinicId.toString();
    }

    return next();
  }

  // Doctor accessing clinic data
  if (req.user.role === ROLES.DOCTOR) {
    if (req.params.clinicId && req.user.clinicId && req.params.clinicId.toString() !== req.user.clinicId.toString()) {
      return next(
        new ForbiddenError('Access denied: You cannot access another clinic', ERROR_CODES.FORBIDDEN)
      );
    }
    return next();
  }

  return next(new ForbiddenError('Access denied for this role', ERROR_CODES.FORBIDDEN));
};

export default {
  requireRole,
  enforceClinicScope,
};
