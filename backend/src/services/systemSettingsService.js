import { SystemSettings } from '../models/index.js';
import logger from '../utils/logger.js';

class SystemSettingsService {
  /**
   * Get application system settings singleton
   */
  async getSettings() {
    const settings = await SystemSettings.getSettings();
    const obj = settings.toObject ? settings.toObject() : settings;
    return {
      ...obj,
      slotDurationDefaultMinutes: obj.defaultSlotDurationMinutes || 30,
      currency: 'INR',
      defaultCurrency: 'INR',
      allowIndependentDoctors: obj.allowIndependentDoctors !== false,
      twoFactorEnforcedForStaff: obj.twoFactorEnforcedForStaff !== false,
      maintenanceMode: Boolean(obj.maintenanceMode),
    };
  }

  /**
   * Update application system settings (Platform Admin only)
   */
  async updateSettings(updateData) {
    const settings = await SystemSettings.getSettings();

    const slotDuration = updateData.defaultSlotDurationMinutes ?? updateData.slotDurationDefaultMinutes;
    if (slotDuration !== undefined) {
      settings.defaultSlotDurationMinutes = Number(slotDuration);
    }

    if (updateData.cancellationWindowHours !== undefined) {
      settings.cancellationWindowHours = Number(updateData.cancellationWindowHours);
    }

    // Force INR currency only as strictly required
    settings.defaultCurrency = 'INR';

    if (updateData.maxAdvanceBookingDays !== undefined) {
      settings.maxAdvanceBookingDays = Number(updateData.maxAdvanceBookingDays);
    }

    if (updateData.allowIndependentDoctors !== undefined) {
      settings.allowIndependentDoctors = Boolean(updateData.allowIndependentDoctors);
    }

    if (updateData.twoFactorEnforcedForStaff !== undefined) {
      settings.twoFactorEnforcedForStaff = Boolean(updateData.twoFactorEnforcedForStaff);
    }

    if (updateData.autoApproveReviews !== undefined) {
      settings.autoApproveReviews = Boolean(updateData.autoApproveReviews);
    }

    if (updateData.maintenanceMode !== undefined) {
      settings.maintenanceMode = Boolean(updateData.maintenanceMode);
    }

    await settings.save();
    logger.info('System settings updated successfully with INR currency enforcement');
    return this.getSettings();
  }
}

export const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;
