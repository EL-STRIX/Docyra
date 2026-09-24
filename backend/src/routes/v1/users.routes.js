import express from 'express';
import { exportMyData, updateMyConsent, updateMyProfile } from '../../controllers/user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { consentSchema } from '../../validators/user.validator.js';

const router = express.Router();

router.use(authenticate);

// GDPR Data Portability Export
router.get('/me/export', exportMyData);

// Terms & Privacy Consent Update
router.patch('/me/consent', validate(consentSchema), updateMyConsent);

// Profile Update
router.patch('/me/profile', updateMyProfile);

export default router;
