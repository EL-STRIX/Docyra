const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    desiredDateRangeStart: {
      type: Date,
      required: true
    },
    desiredDateRangeEnd: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'claimed', 'expired'],
      default: 'waiting',
      index: true
    },
    notifiedAt: {
      type: Date,
      default: null
    },
    claimExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

waitlistSchema.index({ doctorId: 1, desiredDateRangeStart: 1, status: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
