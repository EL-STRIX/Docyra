import mongoose from 'mongoose';

const waitlistSchema = new mongoose.Schema(
  {
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
    desiredDateRangeStart: {
      type: Date,
      required: true,
    },
    desiredDateRangeEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'claimed', 'expired', 'cancelled'],
      default: 'waiting',
      required: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    claimExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
waitlistSchema.index({ doctorId: 1, desiredDateRangeStart: 1, status: 1 });
waitlistSchema.index({ patientId: 1, doctorId: 1, status: 1 });

export const Waitlist = mongoose.model('Waitlist', waitlistSchema);
export default Waitlist;
