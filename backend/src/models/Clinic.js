const mongoose = require('mongoose');
const { CLINIC_STATUS } = require('../config/constants');

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      unique: true,
      trim: true,
      index: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true
    },
    subscriptionStatus: {
      type: String,
      enum: Object.values(CLINIC_STATUS),
      default: CLINIC_STATUS.ACTIVE,
      index: true
    },
    onboardedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    specializationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialization'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Clinic', clinicSchema);
