import { userService } from '../services/userService.js';
import { auditService } from '../services/auditService.js';
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

/**
 * Platform Admin & Operations: List users / patients with search and pagination
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { role, status, search, page, limit } = req.query;
  const result = await userService.listUsers({ role, status, search, page, limit });

  res.status(200).json({
    success: true,
    data: result.users,
    meta: result.meta,
  });
});

/**
 * Platform Admin & Operations: Get detailed user profile
 */
export const getUserDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await userService.getUserDetail(id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Platform Admin: Update user account status (Activate / Suspend)
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = await userService.updateUserStatus(id, status, req.user);

  auditService.log({
    actorId: req.user._id || req.user.id,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: status === 'active' ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_SUSPENDED',
    resourceType: 'User',
    resourceId: id,
    ipAddress: (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').toString().replace('::ffff:', ''),
    userAgent: req.headers['user-agent'] || 'Docyra-Admin',
    metadata: {
      targetUserEmail: user.email,
      targetUserName: user.name,
      newStatus: status,
    },
  });

  res.status(200).json({
    success: true,
    data: user,
    message: `Patient account has been ${status === 'active' ? 'activated' : 'suspended'} successfully.`,
  });
});

export default {
  exportMyData,
  updateMyConsent,
  updateMyProfile,
  listUsers,
  getUserDetail,
  updateUserStatus,
};
