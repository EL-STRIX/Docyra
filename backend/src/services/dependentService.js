const { Dependent } = require('../models');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');

class DependentService {
  async addDependent(patientId, { name, relationship, dateOfBirth }) {
    if (!name || !relationship || !dateOfBirth) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Name, relationship, and dateOfBirth are required');
    }

    return Dependent.create({
      patientId,
      name: name.trim(),
      relationship: relationship.trim(),
      dateOfBirth: new Date(dateOfBirth)
    });
  }

  async getPatientDependents(patientId) {
    return Dependent.find({ patientId }).sort({ createdAt: -1 });
  }

  async deleteDependent(patientId, dependentId) {
    const dependent = await Dependent.findOneAndDelete({ _id: dependentId, patientId });
    if (!dependent) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Dependent not found');
    }
    return dependent;
  }
}

module.exports = new DependentService();
