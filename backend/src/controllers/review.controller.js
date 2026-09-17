const reviewService = require('../services/reviewService');
const asyncHandler = require('../utils/asyncHandler');

const submitReview = asyncHandler(async (req, res) => {
  const review = await reviewService.submitReview({
    patientId: req.user._id,
    ...req.body
  });

  res.status(201).json({
    success: true,
    data: {
      message: review.status === 'flagged'
        ? 'Review submitted and held for moderation.'
        : 'Review published successfully!',
      review
    }
  });
});

const editReview = asyncHandler(async (req, res) => {
  const review = await reviewService.editReview(req.user._id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: review
  });
});

const getDoctorReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getDoctorReviews(req.params.doctorId, req.query);
  res.status(200).json({
    success: true,
    data: result.reviews,
    meta: result.meta
  });
});

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getPatientReviews(req.user._id);
  res.status(200).json({
    success: true,
    data: reviews
  });
});

const getFlaggedReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewService.getFlaggedReviews();
  res.status(200).json({
    success: true,
    data: reviews
  });
});

const moderateReview = asyncHandler(async (req, res) => {
  const review = await reviewService.moderateReview(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    data: review
  });
});

module.exports = {
  submitReview,
  editReview,
  getDoctorReviews,
  getMyReviews,
  getFlaggedReviews,
  moderateReview
};
