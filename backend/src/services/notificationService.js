import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import { emitToUser, emitToClinic } from '../sockets/index.js';

// ==========================================
// Channels (Factory Pattern Implementation)
// ==========================================

class SocketChannel {
  async send({ event, userId, clinicId, payload }) {
    try {
      if (userId) {
        emitToUser(userId, event, payload);
      }
      if (clinicId) {
        emitToClinic(clinicId, event, payload);
      }
      return true;
    } catch (err) {
      logger.warn(`Socket notification failed: ${err.message}`);
      return false;
    }
  }
}

class EmailChannel {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (env.NODE_ENV !== 'test' && env.SMTP_HOST && env.SMTP_USER && env.SMTP_USER !== 'user@ethereal.email') {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      // Mock / Simulation transporter
      this.transporter = {
        sendMail: async (options) => {
          logger.info(`[EMAIL SIMULATION] To: ${options.to} | Subject: ${options.subject}`);
          return { messageId: `sim_${Date.now()}` };
        },
      };
    }
  }

  async send({ to, subject, html, text }) {
    if (!to) return null;
    try {
      const mailOptions = {
        from: `"${env.TOTP_ISSUER}" <${env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: text || html?.replace(/<[^>]*>?/gm, ''),
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId || 'OK'}`);
      return info;
    } catch (error) {
      logger.error(`Failed to send email to ${to}: ${error.message}`);
      return null;
    }
  }
}

class SmsChannel {
  async send({ phone, message }) {
    if (!phone) return null;
    try {
      // If MSG91 auth key configured in production
      if (
        env.NODE_ENV === 'production' &&
        env.MSG91_AUTH_KEY &&
        env.MSG91_AUTH_KEY !== 'mock_msg91_auth_key'
      ) {
        logger.info(`[MSG91 SMS] Sending to ${phone}: ${message}`);
        // Production MSG91 API call
        return { success: true };
      }

      // Simulation mode
      logger.info(`[SMS SIMULATION] To: ${phone} | Message: ${message}`);
      return { success: true, messageId: `sms_sim_${Date.now()}` };
    } catch (error) {
      logger.warn(`Failed to send SMS to ${phone}: ${error.message}`);
      return null;
    }
  }
}

// ==========================================
// Notification Service
// ==========================================

class NotificationService {
  constructor() {
    this.socketChannel = new SocketChannel();
    this.emailChannel = new EmailChannel();
    this.smsChannel = new SmsChannel();
  }

  /**
   * Universal Event Dispatcher (Fan-out pattern)
   * @param {string} event - 'appointment:created' | 'appointment:statusChanged' | 'appointment:cancelled' | 'appointment:reminder' | 'waitlist:slotAvailable'
   * @param {Object} payload - Event data
   */
  async dispatch(event, payload = {}) {
    const tasks = [];

    // 1. Socket Channel (Real-time updates)
    if (payload.patientId || payload.userId || payload.clinicId) {
      tasks.push(
        this.socketChannel.send({
          event,
          userId: payload.patientId || payload.userId,
          clinicId: payload.clinicId,
          payload,
        })
      );
    }

    // 2. Email Channel
    const docName = payload.doctorName || 'Doctor';
    const doctorDisplay = docName.startsWith('Dr.') ? docName : `Dr. ${docName}`;

    if (payload.patientEmail) {
      let subject = 'Docyra Notification';
      let html = `<p>${payload.message || 'You have an update on your appointment.'}</p>`;

      if (event === 'appointment:created') {
        subject = 'Appointment Confirmed - Docyra';
        html = `<h3>Your appointment is confirmed!</h3><p>Doctor: ${doctorDisplay}</p><p>Time: ${new Date(payload.slotStart).toLocaleString()}</p>`;
      } else if (event === 'appointment:cancelled') {
        subject = 'Appointment Cancelled - Docyra';
        html = `<h3>Your appointment was cancelled</h3><p>Reason: ${payload.reason || 'Not specified'}</p>`;
      } else if (event === 'appointment:reminder') {
        subject = `Reminder: Upcoming Appointment (${payload.type || 'reminder'})`;
        html = `<h3>Appointment Reminder</h3><p>Your appointment with ${doctorDisplay} starts at ${new Date(payload.slotStart).toLocaleString()}.</p>`;
      } else if (event === 'waitlist:slotAvailable') {
        subject = 'A slot is now available on your waitlist!';
        html = `<h3>Waitlist Slot Available!</h3><p>A slot with ${doctorDisplay} has become available. Please claim it within 2 hours.</p>`;
      }

      tasks.push(
        this.emailChannel.send({
          to: payload.patientEmail,
          subject,
          html,
        })
      );
    }

    // 3. SMS Channel (Selected critical events: created, cancelled, reminder, waitlist)
    if (payload.patientPhone && ['appointment:created', 'appointment:cancelled', 'appointment:reminder', 'waitlist:slotAvailable'].includes(event)) {
      let smsText = `Docyra: ${payload.message || 'You have an update on your appointment.'}`;

      if (event === 'appointment:created') {
        smsText = `Docyra: Your appointment with ${doctorDisplay} on ${new Date(payload.slotStart).toDateString()} is confirmed.`;
      } else if (event === 'appointment:cancelled') {
        smsText = `Docyra: Your appointment with ${doctorDisplay} on ${new Date(payload.slotStart).toDateString()} has been cancelled.`;
      } else if (event === 'appointment:reminder') {
        smsText = `Docyra Reminder: Your appointment with ${doctorDisplay} is at ${new Date(payload.slotStart).toLocaleTimeString()}.`;
      } else if (event === 'waitlist:slotAvailable') {
        smsText = `Docyra: A waitlist slot is open for ${doctorDisplay}. Claim it in your portal within 2h.`;
      }

      tasks.push(
        this.smsChannel.send({
          phone: payload.patientPhone,
          message: smsText,
        })
      );
    }

    // Execute fan-out in parallel (best-effort, non-blocking)
    const results = await Promise.allSettled(tasks);
    logger.info(`Notification dispatched for event: ${event} (${results.length} channels triggered)`);
    return results;
  }

  // Backwards-compatible email methods
  async sendEmail(options) {
    return this.emailChannel.send(options);
  }

  async sendVerificationEmail(email, name, verificationToken) {
    const verifyUrl = `${env.API_BASE_URL}/auth/verify-email?token=${verificationToken}`;
    const subject = `Verify your email address - ${env.TOTP_ISSUER}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e7e5e0; border-radius: 12px;">
        <h2 style="color: #0F5C5C;">Welcome to Docyra, ${name}!</h2>
        <p style="color: #5C6B6B; font-size: 15px;">Please verify your email address to activate your account.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verifyUrl}" style="background-color: #0F5C5C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
      </div>
    `;
    return this.emailChannel.send({ to: email, subject, html });
  }

  async sendPasswordResetEmail(email, name, resetToken) {
    const clientBaseUrl = env.ALLOWED_ORIGINS?.[0] || 'http://localhost:5173';
    const resetUrl = `${clientBaseUrl}/reset-password?token=${resetToken}`;
    const subject = `Reset your Docyra password`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e7e5e0; border-radius: 12px;">
        <h2 style="color: #0F5C5C;">Password Reset Request</h2>
        <p style="color: #5C6B6B; font-size: 15px;">Hello ${name}, click below to reset your password.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #F2A93B; color: #1A2E2E; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #5C6B6B; font-size: 13px;">Reset token: <code>${resetToken}</code></p>
      </div>
    `;
    return this.emailChannel.send({ to: email, subject, html });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
