const cron = require('node-cron');
const { Appointment } = require('../models');
const { APPOINTMENT_STATUS } = require('../config/constants');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Sweep and dispatch 24h and 1h reminders (Phase 8, PRD P-7)
 */
const runReminderSweep = async () => {
  const now = new Date();

  // 1. 24-Hour Reminder Sweep (look-ahead window: 23h to 25h from now)
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const appointments24h = await Appointment.find({
    status: APPOINTMENT_STATUS.CONFIRMED,
    reminder24hSent: false,
    slotStart: { $gte: window24hStart, $lte: window24hEnd }
  }).populate('patientId').populate('doctorId');

  for (const apt of appointments24h) {
    try {
      apt.reminder24hSent = true;
      await apt.save();
      await notificationService.notifyReminder(apt, apt.patientId, apt.doctorId, '24h');
      logger.info(`⏰ [ReminderJob] 24h reminder sent for appointment ${apt._id}`);
    } catch (err) {
      logger.error(`❌ [ReminderJob] Error sending 24h reminder for apt ${apt._id}: ${err.message}`);
    }
  }

  // 2. 1-Hour Reminder Sweep (look-ahead window: 45m to 75m from now)
  const window1hStart = new Date(now.getTime() + 45 * 60 * 1000);
  const window1hEnd = new Date(now.getTime() + 75 * 60 * 1000);

  const appointments1h = await Appointment.find({
    status: APPOINTMENT_STATUS.CONFIRMED,
    reminder1hSent: false,
    slotStart: { $gte: window1hStart, $lte: window1hEnd }
  }).populate('patientId').populate('doctorId');

  for (const apt of appointments1h) {
    try {
      apt.reminder1hSent = true;
      await apt.save();
      await notificationService.notifyReminder(apt, apt.patientId, apt.doctorId, '1h');
      logger.info(`⏰ [ReminderJob] 1h reminder sent for appointment ${apt._id}`);
    } catch (err) {
      logger.error(`❌ [ReminderJob] Error sending 1h reminder for apt ${apt._id}: ${err.message}`);
    }
  }

  return {
    reminders24hCount: appointments24h.length,
    reminders1hCount: appointments1h.length
  };
};

let reminderCronJob = null;

const startReminderJob = () => {
  // Run every 15 minutes
  reminderCronJob = cron.schedule('*/15 * * * *', async () => {
    logger.info('⏰ [ReminderJob] Running scheduled appointment reminder sweep...');
    try {
      await runReminderSweep();
    } catch (err) {
      logger.error(`❌ [ReminderJob] Cron execution failed: ${err.message}`);
    }
  });

  logger.info('✅ Scheduled appointment reminder job registered (every 15 min)');
  return reminderCronJob;
};

const stopReminderJob = () => {
  if (reminderCronJob) {
    reminderCronJob.stop();
  }
};

module.exports = {
  runReminderSweep,
  startReminderJob,
  stopReminderJob
};
