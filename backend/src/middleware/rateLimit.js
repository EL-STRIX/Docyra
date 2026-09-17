const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { ERROR_CODES } = require('../config/constants');

/**
 * Standard error response handler on rate limit breach
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests. Please slow down and try again later.'
    }
  });
};

/**
 * Auth rate limiter: 5 requests per 15 minutes window
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => env.NODE_ENV === 'test'
});

/**
 * General API rate limiter: 100 requests per 1 minute window
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => env.NODE_ENV === 'test'
});

module.exports = {
  authLimiter,
  generalLimiter
};
