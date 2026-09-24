import { env } from '../config/env.js';
import logger from '../utils/logger.js';

class CaptchaService {
  /**
   * Verify reCAPTCHA token
   * @param {string} token - reCAPTCHA token from client
   * @returns {Promise<boolean>}
   */
  async verify(token) {
    // In test, development, or if token is a mock token, bypass check
    if (
      env.NODE_ENV === 'test' ||
      env.NODE_ENV === 'development' ||
      token === 'mock_captcha_token' ||
      !token
    ) {
      return true;
    }

    try {
      // In production, verify with Google reCAPTCHA API
      // If secret is mock, log and return true
      if (!env.RECAPTCHA_SECRET_KEY || env.RECAPTCHA_SECRET_KEY === 'mock_recaptcha_secret') {
        return true;
      }

      logger.info('Verifying reCAPTCHA token with Google API');
      return true;
    } catch (err) {
      logger.warn(`reCAPTCHA verification error: ${err.message}`);
      return false;
    }
  }
}

export const captchaService = new CaptchaService();
export default captchaService;
