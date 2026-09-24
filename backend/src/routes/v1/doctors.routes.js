import express from 'express';
import {
  searchDoctors,
  getDoctorProfile,
  applyIndependentDoctor,
  updateProfile,
  uploadMiddleware,
} from '../../controllers/doctor.controller.js';
import {
  setDoctorAvailability,
  getDoctorAvailability,
  getDoctorSlots,
} from '../../controllers/availability.controller.js';
import { emergencyUnavailable } from '../../controllers/appointment.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { applyDoctorSchema } from '../../validators/doctor.validator.js';
import {
  setAvailabilitySchema,
  getDoctorSlotsSchema,
} from '../../validators/availability.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Public: Doctor search and profile detail
router.get('/', searchDoctors);
router.get('/:id', getDoctorProfile);

// Public: Doctor available slots lookup
router.get('/:id/slots', validate(getDoctorSlotsSchema), getDoctorSlots);

// Public: Apply as independent practitioner with license document upload
router.post('/apply', uploadMiddleware, validate(applyDoctorSchema), applyIndependentDoctor);

// Doctor: Update own profile
router.patch('/:id', authenticate, requireRole(ROLES.DOCTOR), updateProfile);

// Doctor / Clinic Admin / Platform Admin: Availability rule management
router.get('/:id/availability', authenticate, getDoctorAvailability);
router.put(
  '/:id/availability',
  authenticate,
  requireRole(ROLES.DOCTOR, ROLES.CLINIC_ADMIN, ROLES.ADMIN),
  validate(setAvailabilitySchema),
  setDoctorAvailability
);

// Doctor / Clinic Admin / Platform Admin: Emergency Unavailability (bulk cancels today's appointments)
router.post(
  '/:id/emergency-unavailable',
  authenticate,
  requireRole(ROLES.DOCTOR, ROLES.CLINIC_ADMIN, ROLES.ADMIN),
  emergencyUnavailable
);

export default router;
