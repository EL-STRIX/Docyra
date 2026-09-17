const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, BOOKED_FOR_TYPE } = require('../config/constants');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bookedForType: {
      type: String,
      enum: Object.values(BOOKED_FOR_TYPE),
      default: BOOKED_FOR_TYPE.SELF
    },
    bookedForId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'bookedForModel'
    },
    bookedForModel: {
      type: String,
      required: true,
      enum: ['User', 'Dependent'],
      default: 'User'
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
      index: true
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppointmentSlot',
      required: true,
      unique: true
    },
    slotStart: {
      type: Date,
      required: true
    },
    slotEnd: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.CONFIRMED,
      index: true
    },
    reasonForVisit: {
      type: String,
      trim: true,
      default: ''
    },
    reminder24hSent: {
      type: Boolean,
      default: false
    },
    reminder1hSent: {
      type: Boolean,
      default: false
    },
    cancelledBy: {
      type: String,
      default: null
    },
    cancellationReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, slotStart: 1 });
appointmentSchema.index({ clinicId: 1, slotStart: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
