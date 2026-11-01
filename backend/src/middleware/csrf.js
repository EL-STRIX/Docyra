import crypto from 'crypto';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../config/constants.js';
import { ForbiddenError } from '../utils/AppError.js';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF Protection Middleware via Double-Submit Cookie pattern
 * - Readable cookie 'csrfToken' set for client access
 * - State-changing requests (POST, PUT, PATCH, DELETE) must supply matching 'X-CSRF-Token' header
 */
export const csrfProtection = (req, res, next) => {
  // Ensure csrfToken cookie exists on all requests
  if (!req.cookies || !req.cookies.csrfToken) {
    const newToken = generateCsrfToken();
    res.cookie('csrfToken', newToken, {
      httpOnly: false, // Must be readable by client frontend (Axios/Angular)
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // Attach to req for the current request
    req.cookies = req.cookies || {};
    req.cookies.csrfToken = newToken;
  }

  // Safe read methods bypass verification
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Exclude public auth endpoints that create initial sessions if needed
  const isPublicAuth =
    req.path.includes('/login') ||
    req.path.includes('/register') ||
    req.path.includes('/forgot-password') ||
    req.path.includes('/reset-password') ||
    req.path.includes('/2fa/login');
  if (isPublicAuth && !req.headers['x-csrf-token'] && !req.headers['x-xsrf-token']) {
    return next();
  }

  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  // Test environment condition per Hard Rule R6.2
  if (env.NODE_ENV === 'test' && !headerToken && !cookieToken) {
    return next();
  }

  // If cookie exists and header is provided, they must match
  if (cookieToken && headerToken) {
    if (cookieToken === headerToken) {
      return next();
    }
    return next(new ForbiddenError('CSRF token mismatch', ERROR_CODES.INVALID_CSRF_TOKEN));
  }

  // If in production/development, require matching CSRF token on mutating requests
  if (env.NODE_ENV !== 'test') {
    if (!headerToken) {
      return next(new ForbiddenError('Missing CSRF token header (X-CSRF-Token)', ERROR_CODES.INVALID_CSRF_TOKEN));
    }
    if (headerToken !== cookieToken) {
      return next(new ForbiddenError('Invalid CSRF token', ERROR_CODES.INVALID_CSRF_TOKEN));
    }
  }

  next();
};

export default csrfProtection;
