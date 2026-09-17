const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    defaultSlotDurationMinutes: {
      type: Number,
      default: 30
    },
    cancellationWindowHours: {
      type: Number,
      default: 2
    },
    defaultCurrency: {
      type: String,
      default: 'INR'
    },
    waitlistClaimWindowMinutes: {
      type: Number,
      default: 30
    },
    termsVersion: {
      type: String,
      default: '1.0'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
