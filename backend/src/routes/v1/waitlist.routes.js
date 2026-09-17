const express = require('express');
const router = express.Router();
const waitlistController = require('../../controllers/waitlist.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');
const auditLogger = require('../../middleware/auditLogger');

// Patient routes
router.use(auth, requireRole(ROLES.PATIENT));

router.post('/', auditLogger('WAITLIST_JOIN', 'Waitlist'), waitlistController.joinWaitlist);
router.get('/my', waitlistController.getMyWaitlist);
router.delete('/:id', auditLogger('WAITLIST_LEAVE', 'Waitlist'), waitlistController.leaveWaitlist);

module.exports = router;
