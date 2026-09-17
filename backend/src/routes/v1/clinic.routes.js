const express = require('express');
const clinicController = require('../../controllers/clinic.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

// Public routes per PRD Section 10
router.get('/', clinicController.listPublicClinics);
router.get('/:id', clinicController.getClinicDetail);

// Admin-only routes per PRD A-1
router.post('/admin', auth, requireRole(ROLES.ADMIN), clinicController.adminCreateClinic);
router.get('/admin/all', auth, requireRole(ROLES.ADMIN), clinicController.adminListClinics);
router.patch('/admin/:id', auth, requireRole(ROLES.ADMIN), clinicController.adminUpdateClinic);
router.delete('/admin/:id', auth, requireRole(ROLES.ADMIN), clinicController.adminDeleteClinic);

module.exports = router;
