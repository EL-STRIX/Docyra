const express = require('express');
const authController = require('../../controllers/auth.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../../validations/auth.validation');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.get('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', auth, authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', auth, authController.getMe);

module.exports = router;
