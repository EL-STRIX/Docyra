const express = require('express');
const specializationController = require('../../controllers/specialization.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

// Public routes
router.get('/', specializationController.getAll);
router.get('/:id', specializationController.getById);

// Admin-only management routes
router.post('/', auth, requireRole(ROLES.ADMIN), specializationController.create);
router.put('/:id', auth, requireRole(ROLES.ADMIN), specializationController.update);
router.delete('/:id', auth, requireRole(ROLES.ADMIN), specializationController.remove);

module.exports = router;
