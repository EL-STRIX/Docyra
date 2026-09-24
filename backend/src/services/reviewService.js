import mongoose from 'mongoose';
import { Review, Appointment, DoctorProfile } from '../models/index.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../utils/AppError.js';
import {
  ERROR_CODES,
  APPOINTMENT_STATUS,
  REVIEW_STATUS,
  ROLES,
} from '../config/constants.js';
import logger from '../utils/logger.js';

// Basic list of vulgar / profanity words for automated moderation check
const PROFANITY_LIST = [
  'scam',
  'fraud',
  'fake',
  'cheat',
  'abuse',
  'idiot',
  'stupid',
  'bastard',
  'asshole',
  'bitch',
  'damn',
  'hell',
];

const checkProfanity = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PROFANITY_LIST.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(lower));
};

class ReviewService {
  /**
   * Submit review for a completed appointment
   */
  async submitReview({ appointmentId, rating, comment, patientId }) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
    }

    // Verify appointment belongs to patient
    if (appointment.patientId.toString() !== patientId) {
      throw new ForbiddenError(
        'You can only review appointments you booked',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Must be COMPLETED status
    if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
      throw new BadRequestError(
        'Reviews can only be submitted for completed appointments',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Check if review already exists
    const existing = await Review.findOne({ appointmentId: appointment._id });
    if (existing) {
      throw new ConflictError(
        'A review has already been submitted for this appointment',
        ERROR_CODES.CONFLICT
      );
    }

    // Check profanity moderation
    const hasProfanity = checkProfanity(comment);
    const status = hasProfanity ? REVIEW_STATUS.FLAGGED : REVIEW_STATUS.PUBLISHED;
    const moderationNote = hasProfanity ? 'Flagged for moderation by automated profanity filter' : null;

    const review = await Review.create({
      appointmentId: appointment._id,
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: appointment.doctorId,
      rating,
      comment,
      status,
      moderationNote,
      editableUntil: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    });

    logger.info(
      `Review submitted: ${review._id} (Status: ${status}) for Doctor ${appointment.doctorId}`
    );

    // Recalculate average rating for doctor
    await this.recalculateDoctorRating(appointment.doctorId);

    return review;
  }

  /**
   * Recalculate average rating and total review count on DoctorProfile
   */
  async recalculateDoctorRating(doctorId) {
    const stats = await Review.aggregate([
      {
        $match: {
          doctorId: new mongoose.Types.ObjectId(doctorId),
          status: REVIEW_STATUS.PUBLISHED,
        },
      },
      {
        $group: {
          _id: '$doctorId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const avg = Math.round(stats[0].avgRating * 10) / 10;
      await DoctorProfile.findByIdAndUpdate(doctorId, {
        avgRating: avg,
        totalReviews: stats[0].totalReviews,
      });
      logger.info(`Doctor ${doctorId} rating updated: ${avg} (${stats[0].totalReviews} reviews)`);
    } else {
      await DoctorProfile.findByIdAndUpdate(doctorId, {
        avgRating: 0,
        totalReviews: 0,
      });
    }
  }

  /**
   * Public: List published reviews for a doctor
   */
  async getDoctorReviews(doctorId, { page = 1, limit = 10 } = {}) {
    const query = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: REVIEW_STATUS.PUBLISHED,
    };

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('patientId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Review.countDocuments(query),
    ]);

    return {
      reviews,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Patient: List reviews submitted by current user
   */
  async getMyReviews(patientId, { page = 1, limit = 10 } = {}) {
    const query = { patientId: new mongoose.Types.ObjectId(patientId) };

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name profilePhotoUrl' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Review.countDocuments(query),
    ]);

    return {
      reviews,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Patient: Update review within 48-hour editable window
   */
  async updateReview(reviewId, { rating, comment }, patientId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found', ERROR_CODES.NOT_FOUND);
    }

    if (review.patientId.toString() !== patientId) {
      throw new ForbiddenError(
        'You do not have permission to edit this review',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Check 48-hour window
    if (new Date() > new Date(review.editableUntil)) {
      throw new BadRequestError(
        'Review edit window has expired (48 hours)',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) {
      review.comment = comment;
      const hasProfanity = checkProfanity(comment);
      review.status = hasProfanity ? REVIEW_STATUS.FLAGGED : REVIEW_STATUS.PUBLISHED;
      review.moderationNote = hasProfanity ? 'Flagged for moderation by automated profanity filter' : null;
    }

    await review.save();
    await this.recalculateDoctorRating(review.doctorId);

    logger.info(`Review ${review._id} updated by patient ${patientId}`);
    return review;
  }

  /**
   * Delete review (Patient owner or Platform Admin)
   */
  async deleteReview(reviewId, currentUser) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found', ERROR_CODES.NOT_FOUND);
    }

    const isPatientOwner =
      currentUser.role === ROLES.PATIENT && review.patientId.toString() === currentUser.id;
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;

    if (!isPatientOwner && !isPlatformAdmin) {
      throw new ForbiddenError(
        'You do not have permission to delete this review',
        ERROR_CODES.FORBIDDEN
      );
    }

    const doctorId = review.doctorId;
    await Review.deleteOne({ _id: review._id });
    await this.recalculateDoctorRating(doctorId);

    logger.info(`Review ${reviewId} deleted by user ${currentUser.id}`);
  }
}

export const reviewService = new ReviewService();
export default reviewService;
