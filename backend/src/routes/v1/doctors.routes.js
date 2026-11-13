import express from 'express';
import {
  searchDoctors,
  getDoctorProfile,
  getMyDoctorProfile,
  applyIndependentDoctor,
  updateProfile,
  updateMyProfile,
  updateDoctorStatus,
  uploadMiddleware,
} from '../../controllers/doctor.controller.js';
import {
  approveDoctorApplication,
  listPendingDoctorApplications,
} from '../../controllers/admin.controller.js';
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

// Public: Doctor search
router.get('/', searchDoctors);

// Doctor: Get my profile (placed before /:id to prevent matching 'me' as id parameter)
router.get('/me', authenticate, requireRole(ROLES.DOCTOR, ROLES.ADMIN), getMyDoctorProfile);

// Platform Admin: Doctor applications listing & review (placed before /:id to prevent matching 'applications' as id parameter)
router.get('/applications', authenticate, requireRole(ROLES.ADMIN), listPendingDoctorApplications);
router.post('/applications/:id/review', authenticate, requireRole(ROLES.ADMIN), approveDoctorApplication);

// Public: Doctor profile detail by ID
router.get('/:id', getDoctorProfile);

// Public: Doctor available slots lookup
router.get('/:id/slots', validate(getDoctorSlotsSchema), getDoctorSlots);

// Public: Apply as independent practitioner with license document upload
router.post('/apply', uploadMiddleware, validate(applyDoctorSchema), applyIndependentDoctor);

// Doctor / Clinic Admin / Platform Admin: Update profile
router.patch('/me', authenticate, requireRole(ROLES.DOCTOR), updateMyProfile);
router.put('/me', authenticate, requireRole(ROLES.DOCTOR), updateMyProfile);
router.patch('/:id', authenticate, requireRole(ROLES.DOCTOR, ROLES.CLINIC_ADMIN, ROLES.ADMIN), updateProfile);
router.put('/:id', authenticate, requireRole(ROLES.DOCTOR, ROLES.CLINIC_ADMIN, ROLES.ADMIN), updateProfile);

// Clinic Admin / Platform Admin: Update doctor status (activate / suspend)
router.patch('/:id/status', authenticate, requireRole(ROLES.CLINIC_ADMIN, ROLES.ADMIN), updateDoctorStatus);

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
