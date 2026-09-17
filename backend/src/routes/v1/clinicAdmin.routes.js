const express = require('express');
const clinicAdminController = require('../../controllers/clinicAdmin.controller');
const auth = require('../../middleware/auth');
const { requireRole, scopeClinic } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

// All routes here require Clinic Admin role and clinic scoping
router.use(auth, requireRole(ROLES.CLINIC_ADMIN), scopeClinic);

router.post('/doctors', clinicAdminController.addDoctor);
router.get('/doctors', clinicAdminController.getDoctors);
router.patch('/doctors/:id', clinicAdminController.updateDoctor);

// Clinic Appointments (CA-1, Phase 6)
router.get('/appointments', require('../../controllers/appointment.controller').getClinicAppointments);

module.exports = router;
