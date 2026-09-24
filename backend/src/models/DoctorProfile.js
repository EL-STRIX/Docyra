import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null, // null for independent practitioners
    },
    specializationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Specialization',
      required: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      default: '',
    },
    licenseDocumentUrl: {
      type: String,
      default: null,
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative'],
      default: 500,
    },
    feeCurrency: {
      type: String,
      default: 'INR',
    },
    clinicAddress: {
      type: String,
      default: null, // used when clinicId is null
    },
    yearsExperience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    manualApprovalMode: {
      type: Boolean,
      default: false, // If true, doctor manually accepts/rejects appointments
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
doctorProfileSchema.index({ clinicId: 1 });
doctorProfileSchema.index({ specializationId: 1 });
doctorProfileSchema.index({ isApproved: 1 });
doctorProfileSchema.index({ avgRating: -1 });

export const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
export default DoctorProfile;
