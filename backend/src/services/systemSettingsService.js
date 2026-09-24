import { SystemSettings } from '../models/index.js';
import logger from '../utils/logger.js';

class SystemSettingsService {
  /**
   * Get application system settings singleton
   */
  async getSettings() {
    return await SystemSettings.getSettings();
  }

  /**
   * Update application system settings (Platform Admin only)
   */
  async updateSettings(updateData) {
    const settings = await SystemSettings.getSettings();
    Object.assign(settings, updateData);
    await settings.save();
    logger.info('System settings updated successfully');
    return settings;
  }
}

export const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;
