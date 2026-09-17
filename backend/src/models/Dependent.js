const mongoose = require('mongoose');

const dependentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Dependent name is required'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    }
  },
  {
    timestamps: true
  }
);

dependentSchema.index({ patientId: 1, name: 1 });

module.exports = mongoose.model('Dependent', dependentSchema);
