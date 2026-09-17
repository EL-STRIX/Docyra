const logger = require('../utils/logger');
const env = require('../config/env');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.transporter = null;
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

  async sendEmail({ to, subject, html, text }) {
    logger.info(`📧 [NotificationService] Email to: ${to} | Subject: "${subject}"`);

    if (this.transporter && env.NODE_ENV !== 'test') {
      try {
        await this.transporter.sendMail({
          from: env.EMAIL_FROM,
          to,
          subject,
          text: text || html,
          html
        });
      } catch (err) {
        logger.error(`Failed to send email via SMTP: ${err.message}`);
      }
    }
    return true;
  }

  async sendVerificationEmail(user, token) {
    const verifyUrl = `${env.API_BASE_URL}/auth/verify-email?token=${token}`;
    return this.sendEmail({
      to: user.email,
      subject: 'Verify your Docyra Account',
      html: `
        <h2>Welcome to Docyra, ${user.name}!</h2>
        <p>Please click the link below to verify your account and activate your profile:</p>
        <p><a href="${verifyUrl}" style="background-color: #0F5C5C; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none;">Verify Account</a></p>
        <p>Or copy this link: ${verifyUrl}</p>
      `
    });
  }

  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${env.API_BASE_URL}/auth/reset-password?token=${token}`;
    return this.sendEmail({
      to: user.email,
      subject: 'Reset your Docyra Password',
      html: `
        <h2>Hello ${user.name},</h2>
        <p>You requested a password reset for your Docyra account. Click the button below to set a new password:</p>
        <p><a href="${resetUrl}" style="background-color: #0F5C5C; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none;">Reset Password</a></p>
        <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
      `
    });
  }
}

module.exports = new NotificationService();
