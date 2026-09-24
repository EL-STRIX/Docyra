import { systemSettingsService } from '../services/systemSettingsService.js';
import { runSlotGenerationJob } from '../jobs/slotGeneration.job.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Platform Admin: Get platform system settings
 */
export const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await systemSettingsService.getSettings();

  res.status(200).json({
    success: true,
    data: settings,
  });
});

/**
 * Platform Admin: Update platform system settings
 */
export const updateSystemSettings = asyncHandler(async (req, res) => {
  const updatedSettings = await systemSettingsService.updateSettings(req.body);

  res.status(200).json({
    success: true,
    message: 'System settings updated successfully',
    data: updatedSettings,
  });
});

/**
 * Platform Admin: Manually trigger slot generation job
 */
export const triggerSlotGenerationJob = asyncHandler(async (req, res) => {
  const result = await runSlotGenerationJob();

  res.status(200).json({
    success: true,
    message: 'Slot generation job executed successfully',
    data: result,
  });
});

export default {
  getSystemSettings,
  updateSystemSettings,
  triggerSlotGenerationJob,
};
