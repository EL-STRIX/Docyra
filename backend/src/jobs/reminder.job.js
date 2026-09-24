import cron from 'node-cron';
import { Appointment } from '../models/index.js';
import { notificationService } from '../services/notificationService.js';
import { APPOINTMENT_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';

let reminderCronTask = null;

/**
 * Sweep appointments needing 24h or 1h reminders and dispatch them idempotently
 */
export const runReminderSweepJob = async () => {
  try {
    const now = new Date();
    let reminders24hSent = 0;
    let reminders1hSent = 0;

    // 1. 24-Hour Reminder Window (appointments starting in 23h to 25h from now)
    const start24h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const end24h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments24h = await Appointment.find({
      status: APPOINTMENT_STATUS.CONFIRMED,
      reminder24hSent: false,
      slotStart: { $gte: start24h, $lte: end24h },
    }).populate('patientId', 'name email phone').populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' },
    });

    for (const appt of appointments24h) {
      if (appt.patientId) {
        await notificationService.dispatch('appointment:reminder', {
          patientId: appt.patientId._id.toString(),
          patientEmail: appt.patientId.email,
          patientPhone: appt.patientId.phone,
          doctorName: appt.doctorId?.userId?.name || 'Doctor',
          slotStart: appt.slotStart,
          type: '24-hour reminder',
        });
      }

      appt.reminder24hSent = true;
      await appt.save();
      reminders24hSent++;
    }

    // 2. 1-Hour Reminder Window (appointments starting in 30m to 90m from now)
    const start1h = new Date(now.getTime() + 30 * 60 * 1000);
    const end1h = new Date(now.getTime() + 90 * 60 * 1000);

    const appointments1h = await Appointment.find({
      status: APPOINTMENT_STATUS.CONFIRMED,
      reminder1hSent: false,
      slotStart: { $gte: start1h, $lte: end1h },
    }).populate('patientId', 'name email phone').populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' },
    });

    for (const appt of appointments1h) {
      if (appt.patientId) {
        await notificationService.dispatch('appointment:reminder', {
          patientId: appt.patientId._id.toString(),
          patientEmail: appt.patientId.email,
          patientPhone: appt.patientId.phone,
          doctorName: appt.doctorId?.userId?.name || 'Doctor',
          slotStart: appt.slotStart,
          type: '1-hour reminder',
        });
      }

      appt.reminder1hSent = true;
      await appt.save();
      reminders1hSent++;
    }

    logger.info(
      `[CRON] Reminder Sweep complete. Sent ${reminders24hSent} (24h) and ${reminders1hSent} (1h) reminders.`
    );

    return {
      reminders24hSent,
      reminders1hSent,
      totalSent: reminders24hSent + reminders1hSent,
    };
  } catch (error) {
    logger.error(`[CRON] Reminder Sweep failed: ${error.message}`);
    throw error;
  }
};

/**
 * Initialize 15-minute cron schedule for reminders
 */
export const startReminderCron = () => {
  if (reminderCronTask) {
    return reminderCronTask;
  }

  // Runs every 15 minutes
  reminderCronTask = cron.schedule('*/15 * * * *', async () => {
    await runReminderSweepJob();
  });

  logger.info('Appointment reminder cron schedule registered (*/15 * * * *)');
  return reminderCronTask;
};

/**
 * Stop reminder cron
 */
export const stopReminderCron = () => {
  if (reminderCronTask) {
    reminderCronTask.stop();
    reminderCronTask = null;
    logger.info('Appointment reminder cron stopped');
  }
};

export default {
  startReminderCron,
  stopReminderCron,
  runReminderSweepJob,
};
