const mongoose = require('mongoose');
const Filter = require('bad-words');
const { Review, Appointment, DoctorProfile } = require('../models');
const { APPOINTMENT_STATUS, REVIEW_STATUS, ERROR_CODES } = require('../config/constants');
const AppError = require('../utils/AppError');
const auditService = require('./auditService');
const logger = require('../utils/logger');

const filter = new Filter();

class ReviewService {
  /**
   * Submit review for completed appointment (P-8, P-8a)
   */
  async submitReview({ patientId, appointmentId, rating, comment = '' }) {
    if (!rating || rating < 1 || rating > 5) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Rating must be an integer between 1 and 5');
    }

    // 1. Verify Appointment exists, belongs to patient, and is completed
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw AppError.notFound(ERROR_CODES.APPOINTMENT_NOT_FOUND, 'Appointment not found');
    }

    if (appointment.patientId.toString() !== patientId.toString()) {
      throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'You can only review your own appointments');
    }

    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      throw AppError.badRequest(
        ERROR_CODES.BAD_REQUEST,
        'Reviews can only be submitted for completed appointments'
      );
    }

    // 2. Check for duplicate review
    const existing = await Review.findOne({ appointmentId });
    if (existing) {
      throw AppError.conflict(ERROR_CODES.REVIEW_ALREADY_EXISTS, 'You have already submitted a review for this appointment');
    }

    // 3. Automated Profanity Moderation Filter (P-8a)
    let status = REVIEW_STATUS.PUBLISHED;
    let cleanComment = comment.trim();

    if (cleanComment && filter.isProfane(cleanComment)) {
      status = REVIEW_STATUS.FLAGGED;
      logger.warn(`🚩 [ReviewService] Review flagged for profanity moderation (Appointment ${appointmentId})`);
    }

    const review = await Review.create({
      appointmentId,
      patientId,
      doctorId: appointment.doctorId,
      rating,
      comment: cleanComment,
      status,
      editableUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7-day edit window
    });

    // 4. Recalculate doctor rating if published
    if (status === REVIEW_STATUS.PUBLISHED) {
      await this.recalculateDoctorRating(appointment.doctorId);
    }

    await auditService.log({
      actorId: patientId,
      actorRole: 'patient',
      action: 'REVIEW_SUBMITTED',
      targetType: 'Review',
      targetId: review._id,
      metadata: { rating, status }
    });

    return review;
  }

  /**
   * Edit submitted review within 7-day edit window (P-8)
   */
  async editReview(patientId, reviewId, { rating, comment }) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Review not found');
    }

    if (review.patientId.toString() !== patientId.toString()) {
      throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'You can only edit your own reviews');
    }

    if (new Date() > new Date(review.editableUntil)) {
      throw AppError.badRequest(ERROR_CODES.BAD_REQUEST, 'The 7-day review edit window has expired');
    }

    if (rating) review.rating = rating;
    if (comment !== undefined) {
      const cleanComment = comment.trim();
      review.comment = cleanComment;
      review.status = filter.isProfane(cleanComment) ? REVIEW_STATUS.FLAGGED : REVIEW_STATUS.PUBLISHED;
    }

    await review.save();

    if (review.status === REVIEW_STATUS.PUBLISHED) {
      await this.recalculateDoctorRating(review.doctorId);
    }

    return review;
  }

  /**
   * Recalculate average rating & total reviews on DoctorProfile
   */
  async recalculateDoctorRating(doctorId) {
    const stats = await Review.aggregate([
      { $match: { doctorId: new mongoose.Types.ObjectId(doctorId), status: REVIEW_STATUS.PUBLISHED } },
      {
        $group: {
          _id: '$doctorId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      const { avgRating, totalReviews } = stats[0];
      await DoctorProfile.findOneAndUpdate(
        { userId: doctorId },
        {
          avgRating: Math.round(avgRating * 10) / 10,
          totalReviews
        }
      );
    } else {
      await DoctorProfile.findOneAndUpdate(
        { userId: doctorId },
        { avgRating: 0, totalReviews: 0 }
      );
    }
  }

  /**
   * Public: Get published reviews for doctor
   */
  async getDoctorReviews(doctorId, { page = 1, limit = 10 } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = { doctorId, status: REVIEW_STATUS.PUBLISHED };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('patientId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(query)
    ]);

    return {
      reviews,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Patient: Get own submitted reviews
   */
  async getPatientReviews(patientId) {
    return Review.find({ patientId })
      .populate('doctorId', 'name')
      .populate('appointmentId')
      .sort({ createdAt: -1 });
  }

  /**
   * Admin: List flagged reviews for moderation
   */
  async getFlaggedReviews() {
    return Review.find({ status: REVIEW_STATUS.FLAGGED })
      .populate('patientId', 'name email')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });
  }

  /**
   * Admin: Moderate flagged review (publish or reject)
   */
  async moderateReview(reviewId, newStatus) {
    if (![REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.REJECTED].includes(newStatus)) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Status must be published or rejected');
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { status: newStatus },
      { new: true }
    );

    if (!review) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Review not found');
    }

    if (newStatus === REVIEW_STATUS.PUBLISHED) {
      await this.recalculateDoctorRating(review.doctorId);
    }

    return review;
  }
}

module.exports = new ReviewService();
