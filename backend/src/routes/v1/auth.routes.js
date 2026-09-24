import express from 'express';
import {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  setup2FA,
  verify2FA,
  login2FA,
  disable2FA,
} from '../../controllers/auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import { generateCsrfToken } from '../../middleware/csrf.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  twoFactorVerifySchema,
  twoFactorLoginSchema,
  twoFactorDisableSchema,
} from '../../validators/auth.validator.js';

const router = express.Router();

// Public CSRF Token endpoint
router.get('/csrf-token', (req, res) => {
  const token = req.cookies?.csrfToken || generateCsrfToken();
  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(200).json({
    success: true,
    data: { csrfToken: token },
  });
});

// Auth Routes with Rate Limiting & Validation
router.post('/register', authLimiter, validate(registerSchema), register);
router.get('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', authenticate, getMe);

// 2FA Routes
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/verify', authenticate, validate(twoFactorVerifySchema), verify2FA);
router.post('/2fa/login', authLimiter, validate(twoFactorLoginSchema), login2FA);
router.post('/2fa/disable', authenticate, validate(twoFactorDisableSchema), disable2FA);

export default router;

