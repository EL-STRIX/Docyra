const express = require('express');
const clinicController = require('../../controllers/clinic.controller');
const doctorController = require('../../controllers/doctor.controller');
const specializationController = require('../../controllers/specialization.controller');
const systemSettingsController = require('../../controllers/systemSettings.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

// Enforce Platform Admin role across all /admin routes
router.use(auth, requireRole(ROLES.ADMIN));

// Clinic Management
router.post('/clinics', clinicController.adminCreateClinic);
router.get('/clinics', clinicController.adminListClinics);
router.patch('/clinics/:id', clinicController.adminUpdateClinic);
router.delete('/clinics/:id', clinicController.adminDeleteClinic);

// Independent Doctor Application Review
router.get('/doctor-applications', doctorController.listDoctorApplications);
router.patch('/doctors/:id/approve', doctorController.approveDoctor);

// Specializations
router.post('/specializations', specializationController.create);
router.put('/specializations/:id', specializationController.update);
router.delete('/specializations/:id', specializationController.remove);

// System Settings (Phase 5)
router.get('/settings', systemSettingsController.getSettings);
router.put('/settings', systemSettingsController.updateSettings);

module.exports = router;
