import { Specialization } from '../models/index.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';

class SpecializationService {
  async listAll() {
    return Specialization.find().sort({ name: 1 }).lean();
  }

  async getById(id) {
    const spec = await Specialization.findById(id).lean();
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }
    return spec;
  }

  async create({ name, description, iconName = 'Stethoscope' }) {
    const existing = await Specialization.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      throw new ConflictError('Specialization already exists', ERROR_CODES.CONFLICT);
    }

    return Specialization.create({
      name,
      description: description || '',
      iconName,
    });
  }

  async update(id, { name, description, iconName }) {
    const spec = await Specialization.findById(id);
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }

    if (name && name !== spec.name) {
      const duplicate = await Specialization.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new ConflictError('Specialization name already in use', ERROR_CODES.CONFLICT);
      }
      spec.name = name;
    }

    if (description !== undefined) spec.description = description;
    if (iconName !== undefined) spec.iconName = iconName;

    await spec.save();
    return spec;
  }

  async delete(id) {
    const spec = await Specialization.findById(id);
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }
    await Specialization.findByIdAndDelete(id);
    return { message: 'Specialization deleted successfully' };
  }
}

export const specializationService = new SpecializationService();
export default specializationService;
