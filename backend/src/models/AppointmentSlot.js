const mongoose = require('mongoose');

const appointmentSlotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    availabilityRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AvailabilityRule',
      default: null
    },
    slotStart: {
      type: Date,
      required: true
    },
    slotEnd: {
      type: Date,
      required: true
    },
    isBooked: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// CRITICAL UNIQUE COMPOUND INDEX (R7.1, TRD Section 5)
appointmentSlotSchema.index(
  { doctorId: 1, slotStart: 1, slotEnd: 1 },
  { unique: true }
);

// Fast availability lookup index
appointmentSlotSchema.index({ doctorId: 1, isBooked: 1, slotStart: 1 });

module.exports = mongoose.model('AppointmentSlot', appointmentSlotSchema);
