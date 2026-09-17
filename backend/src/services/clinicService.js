const { Clinic, DoctorProfile } = require('../models');
const { CLINIC_STATUS, ERROR_CODES } = require('../config/constants');
const AppError = require('../utils/AppError');

class ClinicService {
  /**
   * Public: List active onboarded clinics with filters & pagination
   */
  async listActiveClinics({ page = 1, limit = 10, city, search, specializationId } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = { subscriptionStatus: CLINIC_STATUS.ACTIVE };

    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }

    if (specializationId) {
      query.specializationIds = specializationId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { address: { $regex: new RegExp(search, 'i') } },
        { city: { $regex: new RegExp(search, 'i') } }
      ];
    }

    const [clinics, total] = await Promise.all([
      Clinic.find(query)
        .populate('specializationIds', 'name icon description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Clinic.countDocuments(query)
    ]);

    // Attach doctor count for each clinic
    const clinicsWithDoctorCount = await Promise.all(
      clinics.map(async (c) => {
        const docCount = await DoctorProfile.countDocuments({
          clinicId: c._id,
          isApproved: true
        });
        return {
          ...c.toObject(),
          doctorCount: docCount
        };
      })
    );

    return {
      clinics: clinicsWithDoctorCount,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Public: Get clinic detail + roster of doctors
   */
  async getClinicDetail(id) {
    const clinic = await Clinic.findById(id).populate('specializationIds', 'name icon description');
    if (!clinic || clinic.subscriptionStatus === CLINIC_STATUS.SUSPENDED) {
      throw AppError.notFound(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found or suspended');
    }

    // Fetch doctors at this clinic
    const doctors = await DoctorProfile.find({
      clinicId: clinic._id,
      isApproved: true
    })
      .populate('userId', 'name email phone profilePhotoUrl')
      .populate('specializationId', 'name icon');

    return {
      clinic,
      doctors
    };
  }

  /**
   * Platform Admin: Onboard a new clinic
   */
  async createClinic(clinicData, adminUserId) {
    const existing = await Clinic.findOne({ name: clinicData.name.trim() });
    if (existing) {
      throw AppError.conflict(ERROR_CODES.CONFLICT, 'A clinic with this name already exists');
    }

    const clinic = await Clinic.create({
      ...clinicData,
      onboardedByAdminId: adminUserId,
      subscriptionStatus: clinicData.subscriptionStatus || CLINIC_STATUS.ACTIVE
    });

    return clinic;
  }

  /**
   * Platform Admin: List all clinics
   */
  async listAllClinics({ page = 1, limit = 10, status, search } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (status) query.subscriptionStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { city: { $regex: new RegExp(search, 'i') } }
      ];
    }

    const [clinics, total] = await Promise.all([
      Clinic.find(query)
        .populate('specializationIds', 'name icon')
        .populate('onboardedByAdminId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Clinic.countDocuments(query)
    ]);

    return {
      clinics,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Platform Admin: Update clinic
   */
  async updateClinic(id, updateData) {
    const clinic = await Clinic.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!clinic) {
      throw AppError.notFound(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    return clinic;
  }

  /**
   * Platform Admin: Suspend or delete clinic
   */
  async deleteClinic(id) {
    const clinic = await Clinic.findByIdAndUpdate(
      id,
      { subscriptionStatus: CLINIC_STATUS.SUSPENDED },
      { new: true }
    );
    if (!clinic) {
      throw AppError.notFound(ERROR_CODES.CLINIC_NOT_FOUND, 'Clinic not found');
    }
    return clinic;
  }
}

module.exports = new ClinicService();
