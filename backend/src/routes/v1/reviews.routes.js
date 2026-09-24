import express from 'express';
import {
  submitReview,
  getDoctorReviews,
  getMyReviews,
  updateReview,
  deleteReview,
} from '../../controllers/review.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  submitReviewSchema,
  updateReviewSchema,
} from '../../validators/review.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Public: Get reviews for a doctor
router.get('/doctor/:doctorId', getDoctorReviews);

// Authenticated Patient endpoints
router.post('/', authenticate, requireRole(ROLES.PATIENT), validate(submitReviewSchema), submitReview);
router.get('/my', authenticate, requireRole(ROLES.PATIENT), getMyReviews);
router.patch('/:id', authenticate, requireRole(ROLES.PATIENT), validate(updateReviewSchema), updateReview);
router.delete('/:id', authenticate, requireRole(ROLES.PATIENT, ROLES.ADMIN), deleteReview);

export default router;
