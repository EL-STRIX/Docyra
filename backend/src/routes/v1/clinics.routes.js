import express from 'express';
import { listClinics, getClinicDetail, getMyClinic, getClinicDoctors, updateClinic } from '../../controllers/clinic.controller.js';
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

// Authenticated: Update clinic details (clinic_admin can update own clinic, admin can update any)
router.put('/:id', authenticate, requireRole(ROLES.CLINIC_ADMIN, ROLES.ADMIN), updateClinic);
router.patch('/:id', authenticate, requireRole(ROLES.CLINIC_ADMIN, ROLES.ADMIN), updateClinic);
router.patch('/:id/status', authenticate, requireRole(ROLES.ADMIN), updateClinic);

// Public: Get clinic details with doctor roster
router.get('/:id', getClinicDetail);

export default router;
