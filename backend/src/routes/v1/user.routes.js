const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const auth = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');

// All user routes require authentication
router.use(auth);

// Profile
router.get('/me', userController.getMyProfile);
router.patch('/me', auditLogger('USER_PROFILE_UPDATE', 'User'), userController.updateMyProfile);

// GDPR Data Export & Account Deletion (Phase 9)
router.get('/me/export', auditLogger('GDPR_DATA_EXPORT', 'User'), userController.exportMyData);
router.delete('/me', auditLogger('USER_ACCOUNT_DELETE', 'User'), userController.deleteMyAccount);

module.exports = router;
