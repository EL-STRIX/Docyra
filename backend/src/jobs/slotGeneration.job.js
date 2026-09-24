import cron from 'node-cron';
import { slotService } from '../services/slotService.js';
import logger from '../utils/logger.js';

let cronTask = null;

/**
 * Execute slot generation job immediately
 */
export const runSlotGenerationJob = async () => {
  try {
    logger.info('[CRON] Running scheduled Slot Generation Job...');
    const result = await slotService.generateSlotsForAllDoctors();
    logger.info(
      `[CRON] Slot Generation Job finished. Processed ${result.doctorsProcessed} doctors, created ${result.totalNewSlotsCreated} slots.`
    );
    return result;
  } catch (error) {
    logger.error(`[CRON] Slot Generation Job failed: ${error.message}`);
    throw error;
  }
};

/**
 * Initialize nightly cron schedule (00:00 every day)
 */
export const startSlotGenerationCron = () => {
  if (cronTask) {
    logger.info('Slot generation cron job is already initialized');
    return cronTask;
  }

  // Runs every day at midnight (00:00:00)
  cronTask = cron.schedule('0 0 * * *', async () => {
    await runSlotGenerationJob();
  });

  logger.info('Slot generation nightly cron schedule registered (0 0 * * *)');
  return cronTask;
};

/**
 * Stop cron schedule (useful for graceful shutdown or tests)
 */
export const stopSlotGenerationCron = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Slot generation cron job stopped');
  }
};

export default {
  startSlotGenerationCron,
  stopSlotGenerationCron,
  runSlotGenerationJob,
};
