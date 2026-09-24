import mongoose from 'mongoose';
import { CLINIC_SUBSCRIPTION_STATUS } from '../config/constants.js';

const clinicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Clinic name is required'],
      unique: true,
      trim: true,
      maxlength: [150, 'Clinic name cannot exceed 150 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid contact email'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
    },
    subscriptionStatus: {
      type: String,
      enum: Object.values(CLINIC_SUBSCRIPTION_STATUS),
      default: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
      required: true,
    },
    onboardedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
clinicSchema.index({ subscriptionStatus: 1 });
clinicSchema.index({ city: 1 });

export const Clinic = mongoose.model('Clinic', clinicSchema);
export default Clinic;
