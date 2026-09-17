const socketChannel = require('./channels/socketChannel');
const emailChannel = require('./channels/emailChannel');
const smsChannel = require('./channels/smsChannel');
const env = require('../config/env');
const logger = require('../utils/logger');

const NOTIFICATION_EVENTS = {
  APPOINTMENT_CREATED: 'appointment:created',
  APPOINTMENT_STATUS_CHANGED: 'appointment:statusChanged',
  APPOINTMENT_CANCELLED: 'appointment:cancelled',
  WAITLIST_SLOT_AVAILABLE: 'waitlist:slotAvailable',
  APPOINTMENT_REMINDER_24H: 'appointment:reminder24h',
  APPOINTMENT_REMINDER_1H: 'appointment:reminder1h',
  AUTH_VERIFY_EMAIL: 'auth:verifyEmail',
  AUTH_RESET_PASSWORD: 'auth:resetPassword'
};

class NotificationService {
  /**
   * Universal Dispatcher: Fan-out across Socket, Email, and SMS (architecture.md Section 12)
   */
  async dispatch(eventType, payload) {
    logger.info(`📢 [NotificationService] Dispatching event "${eventType}"`);

    const promises = [];

    // 1. Socket Channel (Real-time updates)
    if (payload.socket !== false) {
      if (payload.recipientId) {
        promises.push(
          socketChannel.send({
            recipientId: payload.recipientId,
            event: eventType,
            data: payload.data || payload
          })
        );
      }
      if (payload.doctorUserId) {
        promises.push(
          socketChannel.send({
            recipientId: payload.doctorUserId,
            event: eventType,
            data: payload.data || payload
          })
        );
      }
      if (payload.clinicId) {
        promises.push(
          socketChannel.send({
            clinicId: payload.clinicId,
            event: eventType,
            data: payload.data || payload
          })
        );
      }
    }

    // 2. Email Channel
    if (payload.email) {
      promises.push(
        emailChannel.send({
          to: payload.email.to,
          subject: payload.email.subject,
          html: payload.email.html,
          text: payload.email.text
        })
      );
    }

    // 3. SMS Channel (selective per Section 12: booking/cancellation/reminders/waitlist)
    const smsEligibleEvents = [
      NOTIFICATION_EVENTS.APPOINTMENT_CREATED,
      NOTIFICATION_EVENTS.APPOINTMENT_CANCELLED,
      NOTIFICATION_EVENTS.APPOINTMENT_REMINDER_24H,
      NOTIFICATION_EVENTS.APPOINTMENT_REMINDER_1H,
      NOTIFICATION_EVENTS.WAITLIST_SLOT_AVAILABLE
    ];

    if (payload.sms && smsEligibleEvents.includes(eventType)) {
      promises.push(
        smsChannel.send({
          to: payload.sms.to,
          message: payload.sms.message
        })
      );
    }

    // Fire and forget, don't throw errors that block the caller
    try {
      await Promise.allSettled(promises);
    } catch (err) {
      logger.error(`❌ [NotificationService] Error executing dispatch fan-out: ${err.message}`);
    }

    return true;
  }

  // --- Specialized Convenience Dispatchers ---

  async notifyBookingCreated(appointment, patientUser, doctorUser, clinic) {
    const formattedDate = new Date(appointment.slotStart).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return this.dispatch(NOTIFICATION_EVENTS.APPOINTMENT_CREATED, {
      recipientId: patientUser._id,
      doctorUserId: doctorUser?._id,
      clinicId: clinic?._id,
      data: {
        appointmentId: appointment._id,
        slotStart: appointment.slotStart,
        status: appointment.status,
        doctorName: doctorUser?.name,
        clinicName: clinic?.name
      },
      email: {
        to: patientUser.email,
        subject: `Appointment Confirmed: ${doctorUser?.name || 'Doctor'} on ${formattedDate}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0F5C5C;">Appointment Confirmation</h2>
            <p>Dear ${patientUser.name},</p>
            <p>Your appointment has been successfully scheduled with <strong>${doctorUser?.name}</strong>.</p>
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
            <p><strong>Clinic:</strong> ${clinic?.name || 'Independent Consultation'}</p>
            <p style="margin-top: 20px;">
              <a href="https://patient.docyra.app/dashboard/appointments/${appointment._id}" style="background-color: #0F5C5C; color: white; padding: 10px 18px; border-radius: 20px; text-decoration: none;">View Appointment</a>
            </p>
          </div>
        `
      },
      sms: patientUser.phone ? {
        to: patientUser.phone,
        message: `Docyra: Your appointment with ${doctorUser?.name} on ${formattedDate} is confirmed.`
      } : null
    });
  }

  async notifyStatusChanged(appointment, patientUser, doctorUser, newStatus) {
    return this.dispatch(NOTIFICATION_EVENTS.APPOINTMENT_STATUS_CHANGED, {
      recipientId: patientUser._id,
      doctorUserId: doctorUser?._id,
      clinicId: appointment.clinicId,
      data: {
        appointmentId: appointment._id,
        status: newStatus
      },
      email: {
        to: patientUser.email,
        subject: `Appointment Status Update: ${newStatus.toUpperCase()}`,
        html: `
          <p>Dear ${patientUser.name},</p>
          <p>Your appointment status with ${doctorUser?.name} has been updated to <strong>${newStatus}</strong>.</p>
        `
      }
    });
  }

  async notifyBookingCancelled(appointment, patientUser, doctorUser, reason = '') {
    const formattedDate = new Date(appointment.slotStart).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return this.dispatch(NOTIFICATION_EVENTS.APPOINTMENT_CANCELLED, {
      recipientId: patientUser._id,
      doctorUserId: doctorUser?._id,
      clinicId: appointment.clinicId,
      data: {
        appointmentId: appointment._id,
        status: 'cancelled',
        reason
      },
      email: {
        to: patientUser.email,
        subject: `Appointment Cancelled: ${formattedDate}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #BA1A1A;">Appointment Cancelled</h2>
            <p>Dear ${patientUser.name},</p>
            <p>Your appointment with <strong>${doctorUser?.name}</strong> on ${formattedDate} has been cancelled.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
        `
      },
      sms: patientUser.phone ? {
        to: patientUser.phone,
        message: `Docyra: Your appointment with ${doctorUser?.name} on ${formattedDate} was cancelled.`
      } : null
    });
  }

  async notifyWaitlistSlotAvailable(waitlistEntry, patientUser, doctorUser, slot) {
    const formattedDate = new Date(slot.slotStart).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return this.dispatch(NOTIFICATION_EVENTS.WAITLIST_SLOT_AVAILABLE, {
      recipientId: patientUser._id,
      data: {
        waitlistId: waitlistEntry._id,
        slotId: slot._id,
        slotStart: slot.slotStart,
        claimExpiresAt: waitlistEntry.claimExpiresAt
      },
      email: {
        to: patientUser.email,
        subject: `Waitlist Slot Available: ${doctorUser?.name} on ${formattedDate}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #0F5C5C;">A Slot Has Opened Up!</h2>
            <p>Dear ${patientUser.name},</p>
            <p>A slot just became available for <strong>${doctorUser?.name}</strong> on <strong>${formattedDate}</strong>.</p>
            <p>You have 30 minutes to claim this slot before it is offered to the next waitlisted patient.</p>
            <p style="margin-top: 20px;">
              <a href="https://patient.docyra.app/book/${doctorUser?._id}?slotId=${slot._id}" style="background-color: #0F5C5C; color: white; padding: 10px 18px; border-radius: 20px; text-decoration: none;">Claim Slot Now</a>
            </p>
          </div>
        `
      },
      sms: patientUser.phone ? {
        to: patientUser.phone,
        message: `Docyra: A slot with ${doctorUser?.name} on ${formattedDate} is now open! Claim within 30 min.`
      } : null
    });
  }

  async notifyReminder(appointment, patientUser, doctorUser, reminderType = '24h') {
    const eventType = reminderType === '24h'
      ? NOTIFICATION_EVENTS.APPOINTMENT_REMINDER_24H
      : NOTIFICATION_EVENTS.APPOINTMENT_REMINDER_1H;

    const formattedDate = new Date(appointment.slotStart).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    return this.dispatch(eventType, {
      recipientId: patientUser._id,
      data: {
        appointmentId: appointment._id,
        reminderType,
        slotStart: appointment.slotStart
      },
      email: {
        to: patientUser.email,
        subject: `Appointment Reminder (${reminderType.toUpperCase()}): Dr. ${doctorUser?.name}`,
        html: `
          <p>Dear ${patientUser.name},</p>
          <p>This is a reminder for your upcoming appointment with ${doctorUser?.name} on <strong>${formattedDate}</strong>.</p>
        `
      },
      sms: patientUser.phone ? {
        to: patientUser.phone,
        message: `Docyra Reminder: Your appointment with ${doctorUser?.name} is scheduled for ${formattedDate}.`
      } : null
    });
  }

  async sendVerificationEmail(user, token) {
    const verifyUrl = `${env.API_BASE_URL}/auth/verify-email?token=${token}`;
    return this.dispatch(NOTIFICATION_EVENTS.AUTH_VERIFY_EMAIL, {
      recipientId: user._id,
      socket: false,
      email: {
        to: user.email,
        subject: 'Verify your Docyra Account',
        html: `
          <h2>Welcome to Docyra, ${user.name}!</h2>
          <p>Please click the link below to verify your account and activate your profile:</p>
          <p><a href="${verifyUrl}" style="background-color: #0F5C5C; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none;">Verify Account</a></p>
          <p>Or copy this link: ${verifyUrl}</p>
        `
      }
    });
  }

  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${env.API_BASE_URL}/auth/reset-password?token=${token}`;
    return this.dispatch(NOTIFICATION_EVENTS.AUTH_RESET_PASSWORD, {
      recipientId: user._id,
      socket: false,
      email: {
        to: user.email,
        subject: 'Reset your Docyra Password',
        html: `
          <h2>Hello ${user.name},</h2>
          <p>You requested a password reset for your Docyra account. Click the button below to set a new password:</p>
          <p><a href="${resetUrl}" style="background-color: #0F5C5C; color: white; padding: 10px 20px; border-radius: 20px; text-decoration: none;">Reset Password</a></p>
          <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        `
      }
    });
  }
}

module.exports = new NotificationService();
