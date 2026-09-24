import mongoose from 'mongoose';
import { REVIEW_STATUS } from '../config/constants.js';

const reviewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true, // Only 1 review per appointment
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PUBLISHED,
      required: true,
    },
    editableUntil: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours edit window
    },
    moderationNote: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ doctorId: 1, status: 1 });
reviewSchema.index({ patientId: 1 });

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
