const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
      index: true
    },
    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialization',
      required: true,
      index: true
    },
    qualifications: [
      {
        type: String,
        trim: true
      }
    ],
    bio: {
      type: String,
      trim: true,
      default: ''
    },
    licenseDocumentUrl: {
      type: String,
      default: null
    },
    consultationFee: {
      type: Number,
      required: true,
      min: 0,
      default: 500
    },
    feeCurrency: {
      type: String,
      default: 'INR'
    },
    clinicAddress: {
      type: String,
      trim: true,
      default: ''
    },
    yearsExperience: {
      type: Number,
      default: 0,
      min: 0
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    manualApprovalMode: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
