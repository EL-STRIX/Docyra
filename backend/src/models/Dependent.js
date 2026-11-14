import mongoose from 'mongoose';

const dependentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Dependent name is required'],
      trim: true,
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required (e.g. child, spouse, parent)'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown', null],
      default: null,
    },
    allergies: {
      type: String,
      trim: true,
      default: '',
    },
    chronicConditions: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    heightCm: {
      type: Number,
      default: null,
    },
    weightKg: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

dependentSchema.index({ patientId: 1 });

export const Dependent = mongoose.model('Dependent', dependentSchema);
export default Dependent;
