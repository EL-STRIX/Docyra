const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/review.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');
const auditLogger = require('../../middleware/auditLogger');

// Public: Get published doctor reviews
router.get('/doctor/:doctorId', reviewController.getDoctorReviews);

// Patient: Get own reviews
router.get('/my', auth, requireRole(ROLES.PATIENT), reviewController.getMyReviews);

// Patient: Submit review
router.post(
  '/',
  auth,
  requireRole(ROLES.PATIENT),
  auditLogger('REVIEW_CREATE', 'Review'),
  reviewController.submitReview
);

// Patient: Edit review
router.patch(
  '/:id',
  auth,
  requireRole(ROLES.PATIENT),
  auditLogger('REVIEW_EDIT', 'Review'),
  reviewController.editReview
);

// Admin: Moderate reviews
router.get(
  '/admin/flagged',
  auth,
  requireRole(ROLES.ADMIN),
  reviewController.getFlaggedReviews
);

router.patch(
  '/admin/:id/moderate',
  auth,
  requireRole(ROLES.ADMIN),
  auditLogger('REVIEW_MODERATE', 'Review'),
  reviewController.moderateReview
);

module.exports = router;
