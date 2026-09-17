const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  res.status(200).json({
    success: true,
    data: user
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.status(200).json({
    success: true,
    data: user
  });
});

const exportMyData = asyncHandler(async (req, res) => {
  const bundle = await userService.exportUserData(req.user._id);
  res.status(200).json({
    success: true,
    data: bundle
  });
});

const deleteMyAccount = asyncHandler(async (req, res) => {
  const result = await userService.deleteAccount(req.user._id);
  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  exportMyData,
  deleteMyAccount
};
