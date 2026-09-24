import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
  {
    defaultSlotDurationMinutes: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    cancellationWindowHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
    },
    defaultCurrency: {
      type: String,
      default: 'INR',
    },
    maxAdvanceBookingDays: {
      type: Number,
      default: 60,
      min: 1,
      max: 365,
    },
    autoApproveReviews: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to get the singleton system settings
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
export default SystemSettings;
