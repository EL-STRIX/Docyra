import express from 'express';
import {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  getDoctorAppointments,
  getClinicAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  exportAppointmentIcs,
} from '../../controllers/appointment.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  bookAppointmentSchema,
  updateAppointmentStatusSchema,
  cancelAppointmentSchema,
} from '../../validators/appointment.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// All appointment routes require authentication
router.use(authenticate);

// Patient routes
router.post(
  '/',
  requireRole(ROLES.PATIENT, ROLES.ADMIN),
  validate(bookAppointmentSchema),
  bookAppointment
);
router.get('/my', requireRole(ROLES.PATIENT), getMyAppointments);

// Doctor routes
router.get('/doctor', requireRole(ROLES.DOCTOR, ROLES.ADMIN), getDoctorAppointments);

// Clinic Admin routes
router.get('/clinic', requireRole(ROLES.CLINIC_ADMIN, ROLES.ADMIN), getClinicAppointments);

// Single Appointment Details & ICS export
router.get('/:id', getAppointmentById);
router.get('/:id/ics', exportAppointmentIcs);

// Status update and cancellation
router.patch(
  '/:id/status',
  requireRole(ROLES.DOCTOR, ROLES.CLINIC_ADMIN, ROLES.ADMIN),
  validate(updateAppointmentStatusSchema),
  updateAppointmentStatus
);

router.patch(
  '/:id/cancel',
  validate(cancelAppointmentSchema),
  cancelAppointment
);

export default router;
