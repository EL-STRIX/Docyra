import express from 'express';
import {
  addDoctorToClinic,
  listClinicDoctors,
  updateClinicDoctor,
  listClinicDoctorApplications,
  reviewClinicDoctorApplication,
} from '../../controllers/clinicAdmin.controller.js';
import { getClinicAppointments } from '../../controllers/appointment.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole, enforceClinicScope } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { auditLogger } from '../../middleware/auditLogger.js';
import { clinicAdminAddDoctorSchema, approveDoctorSchema } from '../../validators/doctor.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Enforce authentication, role check, and server-side clinic scoping across all clinic-admin routes
router.use(authenticate, requireRole(ROLES.CLINIC_ADMIN), enforceClinicScope);

// Doctors management
router.post('/doctors', validate(clinicAdminAddDoctorSchema), addDoctorToClinic);
router.get('/doctors', listClinicDoctors);
router.patch('/doctors/:id', updateClinicDoctor);

// Clinic Doctor Applications management (Reviewed strictly by Clinic Admin for their clinic)
router.get('/doctor-applications', listClinicDoctorApplications);
router.post(
  '/doctor-applications/:id/review',
  validate(approveDoctorSchema),
  auditLogger('CLINIC_DOCTOR_APPLICATION_REVIEWED', 'DoctorProfile'),
  reviewClinicDoctorApplication
);
router.patch(
  '/doctor-applications/:id/review',
  validate(approveDoctorSchema),
  auditLogger('CLINIC_DOCTOR_APPLICATION_REVIEWED', 'DoctorProfile'),
  reviewClinicDoctorApplication
);

// Clinic Appointments management
router.get('/appointments', getClinicAppointments);

export default router;
