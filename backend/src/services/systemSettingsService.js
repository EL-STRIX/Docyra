const { SystemSettings } = require('../models');

class SystemSettingsService {
  async getSettings() {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({
        defaultSlotDurationMinutes: 30,
        cancellationWindowHours: 2,
        defaultCurrency: 'INR',
        waitlistClaimWindowMinutes: 30,
        termsVersion: '1.0'
      });
    }
    return settings;
  }

  async updateSettings(updateData, adminUserId) {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({
        ...updateData,
        updatedBy: adminUserId
      });
    } else {
      Object.assign(settings, updateData);
      settings.updatedBy = adminUserId;
      await settings.save();
    }
    return settings;
  }
}

module.exports = new SystemSettingsService();
