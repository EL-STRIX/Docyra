import express from 'express';
import {
  exportMyData,
  updateMyConsent,
  updateMyProfile,
  listUsers,
  getUserDetail,
  updateUserStatus,
} from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { consentSchema } from '../../validators/user.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(authenticate);

// List users / patients (Platform Admin & Clinic Admin)
router.get('/', requireRole([ROLES.ADMIN, ROLES.CLINIC_ADMIN]), listUsers);

// GDPR Data Portability Export
router.get('/me/export', exportMyData);

// Terms & Privacy Consent Update
router.patch('/me/consent', validate(consentSchema), updateMyConsent);

// Profile Update
router.patch('/me/profile', updateMyProfile);

// Get specific user details
router.get('/:id', requireRole([ROLES.ADMIN, ROLES.CLINIC_ADMIN]), getUserDetail);

// Update user status (Activate / Suspend) - Admin only
router.patch('/:id/status', requireRole(ROLES.ADMIN), updateUserStatus);

export default router;
