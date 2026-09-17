const cron = require('node-cron');
const availabilityService = require('../services/availabilityService');
const logger = require('../utils/logger');

let scheduledJob = null;

const initSlotGenerationJob = () => {
  // Run every night at 00:00 (midnight)
  scheduledJob = cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ [Cron Job] Running nightly slot generation sweep...');
    try {
      await availabilityService.generateAllSlots(60);
    } catch (error) {
      logger.error(`❌ [Cron Job] Slot generation error: ${error.message}`, error);
    }
  });

  logger.info('🕒 [Cron Job] Nightly slot generation job scheduled (0 0 * * *)');
};

const stopSlotGenerationJob = () => {
  if (scheduledJob) {
    scheduledJob.stop();
  }
};

module.exports = {
  initSlotGenerationJob,
  stopSlotGenerationJob
};
