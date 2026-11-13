import express from 'express';
import {
  listSpecializations,
  getSpecialization,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
} from '../../controllers/specialization.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { auditLogger } from '../../middleware/auditLogger.js';
import { createSpecializationSchema, updateSpecializationSchema } from '../../validators/specialization.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Public: List all specializations
router.get('/', listSpecializations);
router.get('/:id', getSpecialization);

// Admin: Manage specializations
router.post(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate(createSpecializationSchema),
  auditLogger('SPECIALIZATION_CREATED', 'Specialization'),
  createSpecialization
);

router.put(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate(updateSpecializationSchema),
  auditLogger('SPECIALIZATION_UPDATED', 'Specialization'),
  updateSpecialization
);

router.patch(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate(updateSpecializationSchema),
  auditLogger('SPECIALIZATION_UPDATED', 'Specialization'),
  updateSpecialization
);

router.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN),
  auditLogger('SPECIALIZATION_DELETED', 'Specialization'),
  deleteSpecialization
);

export default router;
