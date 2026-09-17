const mongoose = require('mongoose');

const availabilityRuleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // 0 = Sunday
      max: 6  // 6 = Saturday
    },
    startTime: {
      type: String, // format "HH:mm" (e.g. "09:00")
      required: true
    },
    endTime: {
      type: String, // format "HH:mm" (e.g. "17:00")
      required: true
    },
    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

availabilityRuleSchema.index({ doctorId: 1, dayOfWeek: 1 });

module.exports = mongoose.model('AvailabilityRule', availabilityRuleSchema);
