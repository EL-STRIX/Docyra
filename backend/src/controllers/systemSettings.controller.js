const systemSettingsService = require('../services/systemSettingsService');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await systemSettingsService.getSettings();
  res.status(200).json({
    success: true,
    data: settings
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await systemSettingsService.updateSettings(req.body, req.user._id);
  res.status(200).json({
    success: true,
    data: settings
  });
});

module.exports = {
  getSettings,
  updateSettings
};
