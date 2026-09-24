import { userService } from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const exportMyData = asyncHandler(async (req, res) => {
  const data = await userService.exportUserData(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

export const updateMyConsent = asyncHandler(async (req, res) => {
  const { termsVersion } = req.body;
  const result = await userService.updateConsent(req.user._id, termsVersion);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone, timezone, profilePhotoUrl } = req.body;
  const result = await userService.updateProfile(req.user._id, {
    name,
    phone,
    timezone,
    profilePhotoUrl,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export default {
  exportMyData,
  updateMyConsent,
  updateMyProfile,
};
