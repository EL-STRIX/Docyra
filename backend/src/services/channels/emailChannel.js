const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../utils/logger');

class EmailChannel {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
    }
  }

  /**
   * Send transactional email
   */
  async send({ to, subject, html, text }) {
    if (!to) {
      logger.warn('📧 [EmailChannel] Recipient email is missing');
      return false;
    }

    const mailOptions = {
      from: env.EMAIL_FROM,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>?/gm, ''),
      html
    };

    if (this.transporter && env.NODE_ENV === 'production') {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info(`📧 [EmailChannel] Email sent to: ${to} (MessageId: ${info.messageId})`);
        return true;
      } catch (err) {
        logger.error(`❌ [EmailChannel] SMTP send failed: ${err.message}`);
        return false;
      }
    } else {
      // In development or test: log to Winston
      logger.info(`📧 [EmailChannel] Email to: ${to} | Subject: "${subject}"`);
      return true;
    }
  }
}

module.exports = new EmailChannel();
