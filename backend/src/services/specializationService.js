import { Specialization, DoctorProfile } from '../models/index.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';

function generateSlug(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatSpecialization(spec, doctorCount = 0, clinicCount = 0) {
  const idStr = spec._id ? spec._id.toString() : '';
  const slug = spec.slug || generateSlug(spec.name);
  return {
    ...spec,
    _id: idStr,
    id: idStr,
    slug,
    icon: spec.iconName || 'Stethoscope',
    iconName: spec.iconName || 'Stethoscope',
    isActive: true,
    doctorCount,
    clinicCount,
  };
}

class SpecializationService {
  async listAll() {
    const specs = await Specialization.find().sort({ name: 1 }).lean();
    if (!specs || specs.length === 0) return [];

    const specIds = specs.map((s) => s._id);

    // Aggregate doctor count and distinct clinics count
    const docAgg = await DoctorProfile.aggregate([
      { $match: { specializationId: { $in: specIds } } },
      {
        $group: {
          _id: '$specializationId',
          doctorCount: { $sum: 1 },
          clinics: { $addToSet: '$clinicId' },
        },
      },
    ]);

    const countMap = {};
    docAgg.forEach((d) => {
      if (d._id) {
        countMap[d._id.toString()] = {
          doctorCount: d.doctorCount || 0,
          clinicCount: (d.clinics || []).filter(Boolean).length,
        };
      }
    });

    return specs.map((s) => {
      const counts = countMap[s._id.toString()] || { doctorCount: 0, clinicCount: 0 };
      return formatSpecialization(s, counts.doctorCount, counts.clinicCount);
    });
  }

  async getById(id) {
    const spec = await Specialization.findById(id).lean();
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }

    const doctors = await DoctorProfile.find({ specializationId: id })
      .populate('userId', 'name email phone status')
      .populate('clinicId', 'name city address')
      .lean();

    return {
      specialization: formatSpecialization(spec, doctors.length),
      doctors: doctors.map((d) => ({
        _id: d._id ? d._id.toString() : '',
        name: d.userId?.name || 'Practicing Physician',
        email: d.userId?.email || '',
        phone: d.userId?.phone || '',
        clinicName: d.clinicId?.name || 'Independent Practice',
        clinicCity: d.clinicId?.city || 'India',
        experienceYears: d.experienceYears || 0,
        consultationFee: d.consultationFee || 0,
        rating: d.avgRating || 5.0,
      })),
    };
  }

  async create({ name, description, iconName = 'Stethoscope' }) {
    const existing = await Specialization.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      throw new ConflictError('Specialization with this name already exists', ERROR_CODES.CONFLICT);
    }

    const created = await Specialization.create({
      name,
      description: description || '',
      iconName: iconName || 'Stethoscope',
    });

    return formatSpecialization(created.toObject ? created.toObject() : created, 0, 0);
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
        throw new ConflictError('Specialization name already in use by another department', ERROR_CODES.CONFLICT);
      }
      spec.name = name;
    }

    if (description !== undefined) spec.description = description;
    if (iconName !== undefined) spec.iconName = iconName;

    await spec.save();

    const doctorCount = await DoctorProfile.countDocuments({ specializationId: id });
    return formatSpecialization(spec.toObject ? spec.toObject() : spec, doctorCount);
  }

  async delete(id) {
    const spec = await Specialization.findById(id);
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }

    const linkedDoctors = await DoctorProfile.countDocuments({ specializationId: id });
    if (linkedDoctors > 0) {
      throw new ConflictError(
        `Cannot delete "${spec.name}" because it is currently assigned to ${linkedDoctors} doctor(s). Reassign or update doctors first.`,
        ERROR_CODES.CONFLICT
      );
    }

    await Specialization.findByIdAndDelete(id);
    return { message: 'Specialization deleted successfully' };
  }
}

export const specializationService = new SpecializationService();
export default specializationService;
