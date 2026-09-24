import express from 'express';
import {
  createDependent,
  listDependents,
  getDependent,
  updateDependent,
  deleteDependent,
} from '../../controllers/dependent.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createDependentSchema,
  updateDependentSchema,
} from '../../validators/dependent.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Dependent management is for authenticated Patients
router.use(authenticate, requireRole(ROLES.PATIENT));

router.post('/', validate(createDependentSchema), createDependent);
router.get('/', listDependents);
router.get('/:id', getDependent);
router.patch('/:id', validate(updateDependentSchema), updateDependent);
router.delete('/:id', deleteDependent);

export default router;
