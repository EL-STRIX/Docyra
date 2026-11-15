import mongoose from 'mongoose';
import { APPOINTMENT_STATUS, BOOKED_FOR_TYPE } from '../config/constants.js';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookedForType: {
      type: String,
      enum: Object.values(BOOKED_FOR_TYPE),
      default: BOOKED_FOR_TYPE.SELF,
      required: true,
    },
    bookedForId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'bookedForModel',
      default: null, // null if booked for self (or can point to User._id), or points to Dependent._id
    },
    bookedForModel: {
      type: String,
      enum: ['User', 'Dependent'],
      default: 'User',
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null, // null for independent doctors
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppointmentSlot',
      required: true,
      unique: true, // An appointment slot cannot have multiple active appointment documents
    },
    slotStart: {
      type: Date,
      required: true,
    },
    slotEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.PENDING,
      required: true,
    },
    reasonForVisit: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    prescription: {
      medicines: [
        {
          name: { type: String, trim: true, default: '' },
          dosage: { type: String, trim: true, default: '' },
          frequency: { type: String, trim: true, default: '' },
          duration: { type: String, trim: true, default: '' },
          instructions: { type: String, trim: true, default: '' },
        },
      ],
      generalAdvice: { type: String, default: '', trim: true },
      followUpDate: { type: String, default: null },
      followUpDays: { type: Number, default: null },
      prescribedAt: { type: Date, default: null },
    },
    medicalTests: [
      {
        testName: { type: String, trim: true, default: '' },
        instructions: { type: String, default: '', trim: true },
        resultNotes: { type: String, default: '', trim: true },
        resultFileUrl: { type: String, default: null },
        status: {
          type: String,
          enum: ['ordered', 'completed', 'normal', 'abnormal'],
          default: 'ordered',
        },
        orderedAt: { type: Date, default: Date.now },
      },
    ],
    reminder24hSent: {
      type: Boolean,
      default: false,
    },
    reminder1hSent: {
      type: Boolean,
      default: false,
    },
    previousAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'doctor-emergency', 'admin', 'system', null],
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    rescheduledAt: {
      type: Date,
      default: null,
    },
    rescheduleCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, slotStart: 1 });
appointmentSchema.index({ clinicId: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ slotStart: 1, reminder24hSent: 1 });
appointmentSchema.index({ slotStart: 1, reminder1hSent: 1 });
appointmentSchema.index({ previousAppointmentId: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
