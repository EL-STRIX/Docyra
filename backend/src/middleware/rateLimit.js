import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ERROR_CODES } from '../config/constants.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
  skip: (req) => env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit'],
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      },
    });
  },
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, trustProxy: false },
  skip: (req) => env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit'],
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded. Too many requests, please slow down.',
      },
    });
  },
});

export default {
  authLimiter,
  generalLimiter,
};
