import { reviewService } from '../services/reviewService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Patient: Submit review for a completed appointment
 */
export const submitReview = asyncHandler(async (req, res) => {
  const { appointmentId, rating, comment } = req.body;

  const review = await reviewService.submitReview({
    appointmentId,
    rating,
    comment,
    patientId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: review.status === 'flagged' ? 'Review submitted and pending moderation' : 'Review published successfully',
    data: review,
  });
});

/**
 * Public: List reviews for a doctor
 */
export const getDoctorReviews = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { page, limit } = req.query;

  const result = await reviewService.getDoctorReviews(doctorId, { page, limit });

  res.status(200).json({
    success: true,
    data: result.reviews,
    meta: result.meta,
  });
});

/**
 * Patient: List my submitted reviews
 */
export const getMyReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await reviewService.getMyReviews(req.user.id, { page, limit });

  res.status(200).json({
    success: true,
    data: result.reviews,
    meta: result.meta,
  });
});

/**
 * Patient: Edit review within 48h
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const updatedReview = await reviewService.updateReview(
    id,
    { rating, comment },
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: updatedReview,
  });
});

/**
 * Patient / Platform Admin: Delete review
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await reviewService.deleteReview(id, req.user);

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
  });
});

export default {
  submitReview,
  getDoctorReviews,
  getMyReviews,
  updateReview,
  deleteReview,
};
