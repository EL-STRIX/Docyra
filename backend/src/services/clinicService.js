import { Clinic, DoctorProfile } from '../models/index.js';
import { CLINIC_SUBSCRIPTION_STATUS, ERROR_CODES } from '../config/constants.js';
import { NotFoundError, ConflictError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

function formatClinicForOutput(c, doctorCount = 0) {
  const isAct = c.subscriptionStatus === CLINIC_SUBSCRIPTION_STATUS.ACTIVE || c.status === 'active';
  const streetStr = typeof c.address === 'string' ? c.address : (c.address?.street || '');
  const cityStr = c.city || (typeof c.address === 'object' ? c.address?.city : '') || '';
  const stateStr = c.state || (typeof c.address === 'object' ? c.address?.state : '') || '';
  const postalCodeStr = c.postalCode || (typeof c.address === 'object' ? c.address?.postalCode : '') || '';
  const countryStr = c.country || (typeof c.address === 'object' ? c.address?.country : '') || 'India';
  const phoneStr = c.contactPhone || (typeof c.contact === 'object' ? c.contact?.phone : '') || '';
  const emailStr = c.contactEmail || (typeof c.contact === 'object' ? c.contact?.email : '') || '';

  return {
    ...c,
    isActive: isAct,
    status: isAct ? 'active' : 'suspended',
    subscriptionStatus: c.subscriptionStatus || (isAct ? 'active' : 'suspended'),
    doctorCount,
    rating: c.avgRating || 5.0,
    reviewCount: c.totalReviews || 0,
    address: {
      street: streetStr,
      city: cityStr,
      state: stateStr,
      postalCode: postalCodeStr,
      country: countryStr,
    },
    street: streetStr,
    city: cityStr,
    state: stateStr,
    postalCode: postalCodeStr,
    country: countryStr,
    contactPhone: phoneStr,
    contactEmail: emailStr,
    contact: {
      phone: phoneStr,
      email: emailStr,
      website: c.website || '',
    },
  };
}

class ClinicService {
  /**
   * Public: List active clinics with search & pagination (No geo-search, B2B onboarded model)
   */
  async listPublicClinics({ page = 1, limit = 10, search, city }) {
    const query = {
      subscriptionStatus: CLINIC_SUBSCRIPTION_STATUS.ACTIVE,
    };

    if (city) {
      query.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [clinics, total] = await Promise.all([
      Clinic.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Clinic.countDocuments(query),
    ]);

    // Attach doctor count to each clinic
    const clinicIds = clinics.map((c) => c._id);
    const doctorCounts = await DoctorProfile.aggregate([
      { $match: { clinicId: { $in: clinicIds }, isApproved: true } },
      { $group: { _id: '$clinicId', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    doctorCounts.forEach((dc) => {
      countMap[dc._id.toString()] = dc.count;
    });

    const enrichedClinics = clinics.map((c) =>
      formatClinicForOutput(c, countMap[c._id.toString()] || 0)
    );

    return {
      clinics: enrichedClinics,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Public: Get clinic detail with doctor roster
   */
  async getClinicDetail(clinicId) {
    const clinic = await Clinic.findById(clinicId).lean();
    if (!clinic) {
      throw new NotFoundError('Clinic not found', ERROR_CODES.CLINIC_NOT_FOUND);
    }

    // Fetch doctors affiliated with this clinic
    const rawDoctors = await DoctorProfile.find({
      clinicId: clinic._id,
    })
      .populate('userId', 'name email phone profilePhotoUrl status')
      .populate('specializationId', 'name iconName')
      .lean();

    const doctors = rawDoctors.map((doc) => ({
      ...doc,
      name: doc.userId?.name || doc.name || 'Practitioner',
      status: doc.status || (doc.userId?.status === 'active' || doc.isApproved ? 'active' : 'suspended'),
      experienceYears: doc.yearsExperience ?? doc.experienceYears ?? 0,
      yearsExperience: doc.yearsExperience ?? doc.experienceYears ?? 0,
    }));

    return {
      clinic: formatClinicForOutput(clinic, doctors.length),
      doctors,
    };
  }

  /**
   * Platform Admin: Onboard a new clinic
   */
  async onboardClinic({ name, address, city, contactEmail, contactPhone, subscriptionStatus = CLINIC_SUBSCRIPTION_STATUS.ACTIVE, description, adminId }) {
    const existing = await Clinic.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      throw new ConflictError('A clinic with this name already exists', ERROR_CODES.CONFLICT);
    }

    const clinic = await Clinic.create({
      name,
      address,
      city,
      contactEmail,
      contactPhone,
      subscriptionStatus,
      description: description || '',
      onboardedByAdminId: adminId,
    });

    logger.info(`Clinic onboarded: ${clinic.name} (${clinic._id})`);
    return clinic;
  }

  /**
   * Platform Admin: Update clinic details or subscription status
   */
  async updateClinic(clinicId, updateData) {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      throw new NotFoundError('Clinic not found', ERROR_CODES.CLINIC_NOT_FOUND);
    }

    if (updateData.name && updateData.name !== clinic.name) {
      const duplicate = await Clinic.findOne({
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: clinicId },
      });
      if (duplicate) {
        throw new ConflictError('A clinic with this name already exists', ERROR_CODES.CONFLICT);
      }
    }

    Object.assign(clinic, updateData);
    await clinic.save();

    logger.info(`Clinic updated: ${clinic.name} (${clinic._id})`);
    return clinic;
  }

  /**
   * Platform Admin: List all clinics (including suspended and trial)
   */
  async listAllClinicsAdmin({ page = 1, limit = 10, status, search }) {
    const query = {};

    if (status) {
      query.subscriptionStatus = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [clinics, total] = await Promise.all([
      Clinic.find(query)
        .populate('onboardedByAdminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Clinic.countDocuments(query),
    ]);

    return {
      clinics: clinics.map((c) => formatClinicForOutput(c)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}

export const clinicService = new ClinicService();
export default clinicService;
