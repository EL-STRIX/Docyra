const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');

class SmsChannel {
  /**
   * Send SMS via MSG91 or mock logger
   */
  async send({ to, message }) {
    if (!to) {
      logger.warn('📱 [SmsChannel] Recipient phone number is missing');
      return false;
    }

    if (env.MSG91_AUTH_KEY && env.NODE_ENV === 'production') {
      try {
        const response = await axios.post(
          'https://control.msg91.com/api/v5/flow/',
          {
            template_id: 'docyra_general_notification',
            short_url: '0',
            recipients: [
              {
                mobiles: to.replace(/[^0-9]/g, ''),
                message
              }
            ]
          },
          {
            headers: {
              authkey: env.MSG91_AUTH_KEY,
              'content-type': 'application/json'
            }
          }
        );
        logger.info(`📱 [SmsChannel] SMS sent to ${to}: status ${response.status}`);
        return true;
      } catch (err) {
        logger.error(`❌ [SmsChannel] MSG91 send failed: ${err.message}`);
        return false;
      }
    } else {
      logger.info(`📱 [SmsChannel] SMS to ${to} | Message: "${message}"`);
      return true;
    }
  }
}

module.exports = new SmsChannel();
