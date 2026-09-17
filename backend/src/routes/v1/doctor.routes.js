const express = require('express');
const doctorController = require('../../controllers/doctor.controller');
const availabilityController = require('../../controllers/availability.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

// Public routes per PRD Section 10
router.get('/', doctorController.searchDoctors);
router.post('/apply', doctorController.applyIndependentDoctor);
router.get('/:id', doctorController.getDoctorProfile);

// Availability & Slots (Phase 5)
router.get('/:id/availability', availabilityController.getAvailability);
router.put('/:id/availability', auth, availabilityController.setAvailability);
router.get('/:id/slots', availabilityController.getSlots);

// Emergency Unavailability (D-2a, Phase 6)
router.post('/:id/emergency-unavailable', auth, requireRole(ROLES.DOCTOR, ROLES.ADMIN), require('../../controllers/appointment.controller').doctorEmergencyUnavailable);

// Admin-only doctor approval routes (A-2)
router.patch('/:id/approve', auth, requireRole(ROLES.ADMIN), doctorController.approveDoctor);
router.get('/admin/applications', auth, requireRole(ROLES.ADMIN), doctorController.listDoctorApplications);

module.exports = router;
