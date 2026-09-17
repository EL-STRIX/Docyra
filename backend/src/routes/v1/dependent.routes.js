const express = require('express');
const dependentController = require('../../controllers/dependent.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(auth, requireRole(ROLES.PATIENT));

router.post('/', dependentController.addDependent);
router.get('/', dependentController.getDependents);
router.delete('/:id', dependentController.deleteDependent);

module.exports = router;
