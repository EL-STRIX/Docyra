import express from 'express';
import {
  onboardClinic,
  updateClinic,
  listAllClinicsAdmin,
} from '../../controllers/clinic.controller.js';
import {
  approveDoctorApplication,
  listPendingDoctorApplications,
  getPlatformAnalytics,
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
import { listUsers, updateUserStatus, getUserDetail } from '../../controllers/user.controller.js';
import { auditLogger } from '../../middleware/auditLogger.js';
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
router.post('/clinics', validate(onboardClinicSchema), auditLogger('CLINIC_ONBOARD', 'Clinic'), onboardClinic);
router.get('/clinics', listAllClinicsAdmin);
router.patch('/clinics/:id', validate(updateClinicSchema), auditLogger('CLINIC_STATUS_UPDATE', 'Clinic'), updateClinic);

// Independent Doctor Application Reviews
router.get('/doctors/applications', listPendingDoctorApplications);
router.patch('/doctors/:id/approve', validate(approveDoctorSchema), auditLogger('DOCTOR_CREDENTIAL_VERIFIED', 'DoctorProfile'), approveDoctorApplication);
router.post('/doctors/applications/:id/review', auditLogger('DOCTOR_CREDENTIAL_VERIFIED', 'DoctorProfile'), approveDoctorApplication);
router.post('/doctors/:id/review', auditLogger('DOCTOR_CREDENTIAL_VERIFIED', 'DoctorProfile'), approveDoctorApplication);

// Platform Analytics & Intelligence
router.get('/analytics', getPlatformAnalytics);

// Specialization Management
router.post('/specializations', validate(createSpecializationSchema), auditLogger('SPECIALIZATION_CREATED', 'Specialization'), createSpecialization);
router.patch('/specializations/:id', validate(updateSpecializationSchema), auditLogger('SPECIALIZATION_UPDATED', 'Specialization'), updateSpecialization);
router.delete('/specializations/:id', auditLogger('SPECIALIZATION_DELETED', 'Specialization'), deleteSpecialization);

// System Settings Management
router.get('/settings', getSystemSettings);
router.put('/settings', validate(updateSettingsSchema), auditLogger('SYSTEM_SETTINGS_UPDATE', 'SystemSettings'), updateSystemSettings);

// Manual Slot Generation Job Trigger
router.post('/jobs/generate-slots', auditLogger('SLOT_GENERATION_TRIGGERED', 'AppointmentSlot'), triggerSlotGenerationJob);

// Compliance & Security Audit Logs
router.get('/audit-logs', getAuditLogs);

// Patient Management (Admin alias)
router.get('/patients', listUsers);
router.get('/patients/:id', getUserDetail);
router.patch('/patients/:id/status', auditLogger('PATIENT_STATUS_UPDATE', 'User'), updateUserStatus);

export default router;
