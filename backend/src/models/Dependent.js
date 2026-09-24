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
  },
  {
    timestamps: true,
  }
);

dependentSchema.index({ patientId: 1 });

export const Dependent = mongoose.model('Dependent', dependentSchema);
export default Dependent;
