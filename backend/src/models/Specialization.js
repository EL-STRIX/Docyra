import mongoose from 'mongoose';

const specializationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Specialization name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    iconName: {
      type: String,
      default: 'Stethoscope',
    },
  },
  {
    timestamps: true,
  }
);

export const Specialization = mongoose.model('Specialization', specializationSchema);
export default Specialization;
