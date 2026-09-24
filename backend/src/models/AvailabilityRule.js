import mongoose from 'mongoose';

const availabilityRuleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorProfile',
      required: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:mm)'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:mm)'],
    },
    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
availabilityRuleSchema.index({ doctorId: 1, dayOfWeek: 1 });
availabilityRuleSchema.index({ doctorId: 1, isActive: 1 });

export const AvailabilityRule = mongoose.model('AvailabilityRule', availabilityRuleSchema);
export default AvailabilityRule;
