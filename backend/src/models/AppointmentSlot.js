import mongoose from 'mongoose';

const appointmentSlotSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
    },
    availabilityRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AvailabilityRule',
      default: null,
    },
    slotStart: {
      type: Date,
      required: true,
    },
    slotEnd: {
      type: Date,
      required: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE COMPOUND INDEX (prevents duplicate slot creation and double bookings)
appointmentSlotSchema.index({ doctorId: 1, slotStart: 1, slotEnd: 1 }, { unique: true });

// Performance index for availability lookups
appointmentSlotSchema.index({ doctorId: 1, isBooked: 1, slotStart: 1 });

export const AppointmentSlot = mongoose.model('AppointmentSlot', appointmentSlotSchema);
export default AppointmentSlot;
