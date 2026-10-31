import express from 'express';
import { listClinics, getClinicDetail, getMyClinic, getClinicDoctors } from '../../controllers/clinic.controller.js';
import { addDoctorToClinic } from '../../controllers/clinicAdmin.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// List active clinics
router.get('/', listClinics);

// Authenticated: Get my clinic profile (for clinic_admin)
router.get('/me', authenticate, getMyClinic);

// Public / Authenticated: Clinic doctors roster
router.get('/:id/doctors', getClinicDoctors);
router.post('/:id/doctors', authenticate, requireRole(ROLES.CLINIC_ADMIN, ROLES.ADMIN), addDoctorToClinic);

// Public: Get clinic details with doctor roster
router.get('/:id', getClinicDetail);

export default router;
