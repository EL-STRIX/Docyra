const { Specialization } = require('../models');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');

class SpecializationService {
  async getAll() {
    return Specialization.find().sort({ name: 1 });
  }

  async getById(id) {
    const item = await Specialization.findById(id);
    if (!item) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Specialization not found');
    }
    return item;
  }

  async create({ name, description, icon }) {
    const existing = await Specialization.findOne({ name: name.trim() });
    if (existing) {
      throw AppError.conflict(ERROR_CODES.CONFLICT, 'Specialization already exists');
    }
    return Specialization.create({ name: name.trim(), description, icon });
  }

  async update(id, updateData) {
    const item = await Specialization.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!item) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Specialization not found');
    }
    return item;
  }

  async delete(id) {
    const item = await Specialization.findByIdAndDelete(id);
    if (!item) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Specialization not found');
    }
    return item;
  }
}

module.exports = new SpecializationService();
