const bcrypt = require('bcryptjs');
const { DoctorProfile, User } = require('../models');
const { ROLES, USER_STATUS, ERROR_CODES } = require('../config/constants');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const storageService = require('./storageService');

class DoctorService {
  /**
   * Public: Search and filter approved doctors (No Geo per PRD P-3)
   */
  async searchDoctors({ page = 1, limit = 10, clinicId, specializationId, search, minRating, isIndependent } = {}) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const query = { isApproved: true };

    if (clinicId) {
      query.clinicId = clinicId;
    } else if (isIndependent === 'true' || isIndependent === true) {
      query.clinicId = null;
    }

    if (specializationId) {
      query.specializationId = specializationId;
    }

    if (minRating) {
      query.avgRating = { $gte: parseFloat(minRating) };
    }

    // Match search term against doctor name or bio
    let userFilter = { status: USER_STATUS.ACTIVE };
    if (search) {
      userFilter.name = { $regex: new RegExp(search, 'i') };
    }

    // Find active user IDs matching search name
    const matchingUsers = await User.find(userFilter).select('_id');
    const matchingUserIds = matchingUsers.map(u => u._id);

    if (search) {
      query.userId = { $in: matchingUserIds };
    }

    const [doctors, total] = await Promise.all([
      DoctorProfile.find(query)
        .populate('userId', 'name email phone profilePhotoUrl')
        .populate('clinicId', 'name city address subscriptionStatus')
        .populate('specializationId', 'name icon description')
        .sort({ avgRating: -1, totalReviews: -1 })
        .skip(skip)
        .limit(limitNum),
      DoctorProfile.countDocuments(query)
    ]);

    // Filter out doctors whose clinics are suspended
    const validDoctors = doctors.filter(doc => {
      if (!doc.clinicId) return true; // Independent doctor
      return doc.clinicId.subscriptionStatus !== 'suspended';
    });

    return {
      doctors: validDoctors,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Public: Get doctor profile detail by doctor userId or profileId
   */
  async getDoctorProfile(id) {
    let profile = await DoctorProfile.findOne({
      $or: [{ _id: id }, { userId: id }]
    })
      .populate('userId', 'name email phone profilePhotoUrl status timezone')
      .populate('clinicId', 'name city address contactPhone contactEmail')
      .populate('specializationId', 'name icon description');

    if (!profile) {
      throw AppError.notFound(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor profile not found');
    }

    return profile;
  }

  /**
   * Public/Doctor: Apply as independent doctor (D-App)
   */
  async applyIndependentDoctor(data, licenseFile) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw AppError.conflict(ERROR_CODES.EMAIL_ALREADY_EXISTS, 'An account with this email already exists');
    }

    let licenseDocumentUrl = null;
    if (licenseFile) {
      const uploadRes = await storageService.uploadFile(licenseFile, 'licenses');
      licenseDocumentUrl = uploadRes.url;
    }

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: ROLES.DOCTOR,
      clinicId: null, // Independent
      phone: data.phone,
      status: USER_STATUS.ACTIVE, // active account, but profile pending approval
      emailVerifiedAt: new Date()
    });

    const profile = await DoctorProfile.create({
      userId: user._id,
      clinicId: null,
      specializationId: data.specializationId,
      qualifications: Array.isArray(data.qualifications) ? data.qualifications : [data.qualifications],
      bio: data.bio || '',
      licenseDocumentUrl,
      consultationFee: data.consultationFee || 500,
      feeCurrency: data.feeCurrency || 'INR',
      clinicAddress: data.clinicAddress || '',
      yearsExperience: data.yearsExperience || 0,
      isApproved: false // Requires Platform Admin review per PRD D-App
    });

    return { user, profile };
  }

  /**
   * Platform Admin: Approve or reject independent doctor (A-2)
   */
  async approveDoctor(profileId, isApproved) {
    const profile = await DoctorProfile.findByIdAndUpdate(
      profileId,
      { isApproved: Boolean(isApproved) },
      { new: true }
    ).populate('userId', 'name email');

    if (!profile) {
      throw AppError.notFound(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor profile not found');
    }

    return profile;
  }

  /**
   * Platform Admin: List pending doctor applications
   */
  async listDoctorApplications() {
    return DoctorProfile.find({ isApproved: false })
      .populate('userId', 'name email phone createdAt')
      .populate('specializationId', 'name icon')
      .sort({ createdAt: -1 });
  }

  /**
   * Clinic Admin: Add doctor to own clinic (CA-1, architecture Section 7.8)
   * Auto-approved per PRD CA-1, clinicId strictly derived from logged-in Clinic Admin
   */
  async addClinicDoctor(clinicAdminUser, doctorData) {
    if (!clinicAdminUser.clinicId) {
      throw AppError.forbidden(ERROR_CODES.CLINIC_ACCESS_DENIED, 'Clinic Admin is not tied to a clinic');
    }

    const existing = await User.findOne({ email: doctorData.email.toLowerCase() });
    if (existing) {
      throw AppError.conflict(ERROR_CODES.EMAIL_ALREADY_EXISTS, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(doctorData.password || 'Docyra@Doctor123', env.BCRYPT_SALT_ROUNDS);

    const user = await User.create({
      name: doctorData.name,
      email: doctorData.email.toLowerCase(),
      passwordHash,
      role: ROLES.DOCTOR,
      clinicId: clinicAdminUser.clinicId,
      phone: doctorData.phone,
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date()
    });

    const profile = await DoctorProfile.create({
      userId: user._id,
      clinicId: clinicAdminUser.clinicId,
      specializationId: doctorData.specializationId,
      qualifications: Array.isArray(doctorData.qualifications) ? doctorData.qualifications : [doctorData.qualifications],
      bio: doctorData.bio || '',
      consultationFee: doctorData.consultationFee || 500,
      feeCurrency: doctorData.feeCurrency || 'INR',
      yearsExperience: doctorData.yearsExperience || 0,
      isApproved: true // Auto-approved under vetted clinic per PRD CA-1
    });

    return { user, profile };
  }

  /**
   * Clinic Admin: List doctors in own clinic
   */
  async listClinicDoctors(clinicId) {
    return DoctorProfile.find({ clinicId })
      .populate('userId', 'name email phone status')
      .populate('specializationId', 'name icon')
      .sort({ createdAt: -1 });
  }

  /**
   * Clinic Admin: Update doctor in own clinic
   */
  async updateClinicDoctor(clinicId, doctorProfileId, updateData) {
    const profile = await DoctorProfile.findOne({ _id: doctorProfileId, clinicId });
    if (!profile) {
      throw AppError.notFound(ERROR_CODES.DOCTOR_NOT_FOUND, 'Doctor profile not found in your clinic');
    }

    Object.assign(profile, updateData);
    await profile.save();
    return profile;
  }
}

module.exports = new DoctorService();
