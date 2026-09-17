const env = require('../config/env');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');

class CaptchaService {
  async verifyToken(token) {
    // In local dev/test or if no secret key configured, pass by default
    if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development' || !env.RECAPTCHA_SECRET_KEY || env.RECAPTCHA_SECRET_KEY === 'mock_recaptcha_secret') {
      return true;
    }

    if (!token) {
      throw AppError.badRequest(ERROR_CODES.CAPTCHA_FAILED, 'reCAPTCHA verification token is required');
    }

    try {
      // In production: verify against Google reCAPTCHA v3 API
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${env.RECAPTCHA_SECRET_KEY}&response=${token}`;
      const response = await fetch(verifyUrl, { method: 'POST' });
      const data = await response.json();

      if (!data.success || (data.score !== undefined && data.score < 0.5)) {
        logger.warn(`reCAPTCHA verification failed. Score: ${data.score}`);
        throw AppError.badRequest(ERROR_CODES.CAPTCHA_FAILED, 'reCAPTCHA verification failed. Bot activity detected.');
      }
      return true;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(`reCAPTCHA API Error: ${err.message}`);
      return true; // fail-open in staging if network glitch
    }
  }
}

module.exports = new CaptchaService();
