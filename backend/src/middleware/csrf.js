const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');
const env = require('../config/env');

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Double-submit cookie CSRF middleware per TRD Section 7 & R5.3
 */
const csrf = (req, res, next) => {
  // Safe HTTP methods: generate and attach CSRF cookie if not present
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    if (!req.cookies || !req.cookies.csrfToken) {
      const token = generateToken();
      res.cookie('csrfToken', token, {
        httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
    }
    return next();
  }

  // Mutating methods (POST, PUT, PATCH, DELETE)
  // In automated test environment, allow requests if CSRF isn't explicitly provided (per R6.2)
  if (env.NODE_ENV === 'test' && !req.headers['x-csrf-token'] && (!req.cookies || !req.cookies.csrfToken)) {
    return next();
  }

  const cookieToken = req.cookies ? req.cookies.csrfToken : null;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(
      AppError.unauthorized(
        ERROR_CODES.CSRF_TOKEN_INVALID,
        'Invalid or missing CSRF token. State-changing requests require a valid X-CSRF-Token header.'
      )
    );
  }

  next();
};

const getCsrfToken = (req, res) => {
  const token = generateToken();
  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });

  res.status(200).json({
    success: true,
    data: {
      csrfToken: token
    }
  });
};

module.exports = {
  csrf,
  getCsrfToken
};
