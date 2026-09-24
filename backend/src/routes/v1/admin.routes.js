import express from 'express';
import {
  onboardClinic,
  updateClinic,
  listAllClinicsAdmin,
} from '../../controllers/clinic.controller.js';
import {
  approveDoctorApplication,
  listPendingDoctorApplications,
} from '../../controllers/admin.controller.js';
import {
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
} from '../../controllers/specialization.controller.js';
import {
  getSystemSettings,
  updateSystemSettings,
  triggerSlotGenerationJob,
} from '../../controllers/settings.controller.js';
import { getAuditLogs } from '../../controllers/audit.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { onboardClinicSchema, updateClinicSchema } from '../../validators/clinic.validator.js';
import { approveDoctorSchema } from '../../validators/doctor.validator.js';
import { createSpecializationSchema, updateSpecializationSchema } from '../../validators/specialization.validator.js';
import { updateSettingsSchema } from '../../validators/availability.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Enforce Platform Admin role across all routes in this router
router.use(authenticate, requireRole(ROLES.ADMIN));

// Clinic Management
router.post('/clinics', validate(onboardClinicSchema), onboardClinic);
router.get('/clinics', listAllClinicsAdmin);
router.patch('/clinics/:id', validate(updateClinicSchema), updateClinic);

// Independent Doctor Application Reviews
router.get('/doctors/applications', listPendingDoctorApplications);
router.patch('/doctors/:id/approve', validate(approveDoctorSchema), approveDoctorApplication);

// Specialization Management
router.post('/specializations', validate(createSpecializationSchema), createSpecialization);
router.patch('/specializations/:id', validate(updateSpecializationSchema), updateSpecialization);
router.delete('/specializations/:id', deleteSpecialization);

// System Settings Management
router.get('/settings', getSystemSettings);
router.put('/settings', validate(updateSettingsSchema), updateSystemSettings);

// Manual Slot Generation Job Trigger
router.post('/jobs/generate-slots', triggerSlotGenerationJob);

// Compliance & Security Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
