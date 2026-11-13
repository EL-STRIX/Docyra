import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User, DoctorProfile, Clinic, Specialization, AvailabilityRule } from '../models/index.js';
import { ROLES, USER_STATUS, ERROR_CODES } from '../config/constants.js';
import { env } from '../config/env.js';
import { NotFoundError, ConflictError, AppError } from '../utils/AppError.js';
import storageService from './storageService.js';
import logger from '../utils/logger.js';

class DoctorService {
  /**
   * Public: Search and filter doctors (no geolocation by design)
   */
  async searchDoctors({ page = 1, limit = 10, search, specializationId, clinicId, isIndependent, minRating }) {
    const profileMatch = { isApproved: true };

    if (specializationId) {
      if (mongoose.Types.ObjectId.isValid(specializationId)) {
        profileMatch.specializationId = new mongoose.Types.ObjectId(specializationId);
      } else {
        const spec = await Specialization.findOne({ name: new RegExp(`^${specializationId}$`, 'i') });
        if (spec) {
          profileMatch.specializationId = spec._id;
        } else {
          profileMatch.specializationId = new mongoose.Types.ObjectId();
        }
      }
    }

    if (clinicId) {
      if (mongoose.Types.ObjectId.isValid(clinicId)) {
        profileMatch.clinicId = new mongoose.Types.ObjectId(clinicId);
      }
    } else if (isIndependent === 'true' || isIndependent === true) {
      profileMatch.clinicId = null;
    }

    if (minRating) {
      profileMatch.avgRating = { $gte: parseFloat(minRating) };
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    // Use aggregation pipeline to allow searching by doctor name on the User collection
    const pipeline = [
      { $match: profileMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'clinics',
          localField: 'clinicId',
          foreignField: '_id',
          as: 'clinic',
        },
      },
      {
        $unwind: {
          path: '$clinic',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'specializations',
          localField: 'specializationId',
          foreignField: '_id',
          as: 'specialization',
        },
      },
      { $unwind: '$specialization' },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'specialization.name': { $regex: search, $options: 'i' } },
            { 'clinic.name': { $regex: search, $options: 'i' } },
            { bio: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Count total matching
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await DoctorProfile.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Sort and paginate
    pipeline.push(
      { $sort: { avgRating: -1, totalReviews: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: safeLimit },
      {
        $project: {
          _id: 1,
          userId: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            phone: '$user.phone',
            profilePhotoUrl: '$user.profilePhotoUrl',
          },
          name: '$user.name',
          email: '$user.email',
          phone: '$user.phone',
          profilePhotoUrl: '$user.profilePhotoUrl',
          clinicId: {
            $cond: [
              { $ifNull: ['$clinic._id', false] },
              {
                _id: '$clinic._id',
                name: '$clinic.name',
                city: '$clinic.city',
                address: '$clinic.address',
              },
              null,
            ],
          },
          clinicName: '$clinic.name',
          clinicCity: '$clinic.city',
          clinicAddress: {
            $ifNull: ['$clinic.address', '$clinicAddress'],
          },
          specializationId: {
            _id: '$specialization._id',
            name: '$specialization.name',
            iconName: '$specialization.iconName',
          },
          specializationName: '$specialization.name',
          specializationIcon: '$specialization.iconName',
          qualifications: 1,
          bio: 1,
          consultationFee: 1,
          feeCurrency: 1,
          yearsExperience: 1,
          avgRating: 1,
          totalReviews: 1,
          isApproved: 1,
        },
      }
    );

    const doctors = await DoctorProfile.aggregate(pipeline);

    return {
      doctors,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Doctor: Get profile of logged-in doctor by their User ID
   */
  async getDoctorProfileByUserId(userId) {
    const doctor = await DoctorProfile.findOne({ userId })
      .populate('userId', 'name email phone profilePhotoUrl status')
      .populate('clinicId', 'name city address contactPhone contactEmail')
      .populate('specializationId', 'name iconName description')
      .lean();

    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const rules = await AvailabilityRule.find({ doctorId: doctor._id, isActive: true })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    const dayMap = {};
    for (let i = 0; i <= 6; i++) {
      dayMap[i] = { dayOfWeek: i, isActive: false, slots: [] };
    }
    let slotDurationMinutes = 30;
    for (const r of rules) {
      if (r.slotDurationMinutes) slotDurationMinutes = r.slotDurationMinutes;
      dayMap[r.dayOfWeek].isActive = true;
      dayMap[r.dayOfWeek].slots.push({ start: r.startTime, end: r.endTime });
    }
    const weeklySchedule = Object.values(dayMap);

    return {
      ...doctor,
      name: doctor.userId?.name || 'Doctor',
      email: doctor.userId?.email || '',
      phone: doctor.userId?.phone || '',
      profilePhotoUrl: doctor.userId?.profilePhotoUrl || null,
      experienceYears: doctor.yearsExperience ?? doctor.experienceYears ?? 0,
      yearsExperience: doctor.yearsExperience ?? doctor.experienceYears ?? 0,
      weeklySchedule,
      slotDurationMinutes,
      autoAcceptAppointments: !doctor.manualApprovalMode,
    };
  }

  /**
   * Public: Get doctor profile detail by ID
   */
  async getDoctorProfile(doctorId) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new NotFoundError('Doctor profile not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const doctor = await DoctorProfile.findById(doctorId)
      .populate('userId', 'name email phone profilePhotoUrl status')
      .populate('clinicId', 'name city address contactPhone contactEmail')
      .populate('specializationId', 'name iconName description')
      .lean();

    if (!doctor) {
      throw new NotFoundError('Doctor profile not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const rules = await AvailabilityRule.find({ doctorId: doctor._id, isActive: true })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    const dayMap = {};
    for (let i = 0; i <= 6; i++) {
      dayMap[i] = { dayOfWeek: i, isActive: false, slots: [] };
    }
    let slotDurationMinutes = 30;
    for (const r of rules) {
      if (r.slotDurationMinutes) slotDurationMinutes = r.slotDurationMinutes;
      dayMap[r.dayOfWeek].isActive = true;
      dayMap[r.dayOfWeek].slots.push({ start: r.startTime, end: r.endTime });
    }
    const weeklySchedule = Object.values(dayMap);

    return {
      ...doctor,
      name: doctor.userId?.name || 'Doctor',
      email: doctor.userId?.email || '',
      phone: doctor.userId?.phone || '',
      profilePhotoUrl: doctor.userId?.profilePhotoUrl || null,
      experienceYears: doctor.yearsExperience ?? doctor.experienceYears ?? 0,
      yearsExperience: doctor.yearsExperience ?? doctor.experienceYears ?? 0,
      weeklySchedule,
      slotDurationMinutes,
      autoAcceptAppointments: !doctor.manualApprovalMode,
    };
  }

  /**
   * Public / Doctor: Apply to join a Clinic facility with mandatory license upload
   */
  async applyIndependentDoctor({ name, email, password, phone, clinicId, specializationId, qualifications = [], bio, consultationFee = 500, clinicAddress, yearsExperience = 0 }, licenseFile) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    if (!licenseFile) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'License or qualification document upload is mandatory for doctor application');
    }

    if (!clinicId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Target clinic selection is required');
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      throw new NotFoundError('Selected clinic not found', ERROR_CODES.NOT_FOUND);
    }

    // Verify specialization exists
    const spec = await Specialization.findById(specializationId);
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }

    // Upload license document
    const licenseDocumentUrl = await storageService.uploadFile(licenseFile, 'licenses');

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: ROLES.DOCTOR,
      clinicId: clinic._id,
      status: USER_STATUS.UNVERIFIED, // Account created, but clinic approval pending
    });

    const parsedQualifications = Array.isArray(qualifications)
      ? qualifications
      : typeof qualifications === 'string'
      ? qualifications.split(',').map((q) => q.trim())
      : [];

    const computedClinicAddress = clinic.name + (clinic.address?.street ? `, ${clinic.address.street}, ${clinic.address.city}` : '');

    const doctorProfile = await DoctorProfile.create({
      userId: user._id,
      clinicId: clinic._id,
      specializationId: spec._id,
      qualifications: parsedQualifications,
      bio: bio || '',
      licenseDocumentUrl,
      consultationFee: parseFloat(consultationFee) || 500,
      feeCurrency: 'INR',
      clinicAddress: computedClinicAddress || clinicAddress || clinic.name,
      yearsExperience: parseInt(yearsExperience, 10) || 0,
      isApproved: false, // Must be approved by Clinic Admin
      status: 'pending',
    });

    logger.info(`Doctor application submitted to clinic "${clinic.name}": ${user.email} (${doctorProfile._id})`);

    return {
      applicationId: doctorProfile._id,
      userId: user._id,
      clinicId: clinic._id,
      clinicName: clinic.name,
      status: 'pending_review',
      message: `Application submitted successfully to ${clinic.name}. It will be reviewed by the clinic administration.`,
    };
  }

  /**
   * Clinic Admin: List doctor applications submitted to this clinic
   */
  async listClinicDoctorApplications({ clinicId, page = 1, limit = 10, status = 'all' }) {
    if (!clinicId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Clinic ID is required');
    }

    const query = {
      clinicId: new mongoose.Types.ObjectId(clinicId),
    };

    if (status === 'pending') {
      query.isApproved = false;
      query.status = { $ne: 'suspended' };
    } else if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'rejected' || status === 'suspended') {
      query.status = 'suspended';
      query.isApproved = false;
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [applications, total] = await Promise.all([
      DoctorProfile.find(query)
        .populate('userId', 'name email phone createdAt profilePhotoUrl status')
        .populate('specializationId', 'name')
        .populate('clinicId', 'name email phone address')
        .sort({ isApproved: 1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      DoctorProfile.countDocuments(query),
    ]);

    const formattedApps = applications.map((doc) => {
      let appStatus = 'pending';
      if (doc.isApproved) {
        appStatus = 'approved';
      } else if (doc.status === 'suspended') {
        appStatus = 'rejected';
      }

      return {
        _id: doc._id,
        id: doc._id,
        userId: doc.userId,
        name: doc.userId?.name || 'Dr. Practitioner',
        email: doc.userId?.email || '',
        phone: doc.userId?.phone || '',
        specialization: doc.specializationId?.name || 'General Medicine',
        specializationId: doc.specializationId,
        qualifications: doc.qualifications || [],
        yearsExperience: doc.yearsExperience || 0,
        consultationFee: doc.consultationFee || 500,
        feeCurrency: doc.feeCurrency || 'INR',
        clinicAddress: doc.clinicAddress,
        licenseDocumentUrl: doc.licenseDocumentUrl,
        bio: doc.bio,
        status: appStatus,
        isApproved: !!doc.isApproved,
        createdAt: doc.createdAt,
      };
    });

    return {
      applications: formattedApps,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Clinic Admin: Review (Approve / Reject) Doctor Application for their clinic
   */
  async reviewClinicDoctorApplication(doctorProfileId, clinicId, { isApproved, reason }) {
    const doctorProfile = await DoctorProfile.findById(doctorProfileId).populate('userId');
    if (!doctorProfile) {
      throw new NotFoundError('Doctor application not found', ERROR_CODES.NOT_FOUND);
    }

    if (doctorProfile.clinicId?.toString() !== clinicId?.toString()) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'You do not have permission to review applications for other clinics');
    }

    doctorProfile.isApproved = !!isApproved;
    doctorProfile.status = isApproved ? 'active' : 'suspended';
    await doctorProfile.save();

    if (doctorProfile.userId) {
      await User.findByIdAndUpdate(doctorProfile.userId._id, {
        status: isApproved ? USER_STATUS.ACTIVE : USER_STATUS.SUSPENDED,
        clinicId: clinicId,
      });
    }

    logger.info(`Clinic doctor application ${doctorProfileId} review updated to isApproved=${isApproved} by clinic ${clinicId}`);

    return {
      doctorProfile,
      message: isApproved
        ? 'Doctor application approved successfully. The doctor is now affiliated with your clinic.'
        : `Doctor application rejected. Reason: ${reason || 'Not specified'}`,
    };
  }

  /**
   * Platform Admin: Approve or Reject Independent Doctor Application
   */
  async approveOrRejectDoctor(doctorProfileId, { isApproved, reason }) {
    const doctorProfile = await DoctorProfile.findById(doctorProfileId).populate('userId');
    if (!doctorProfile) {
      throw new NotFoundError('Doctor application not found', ERROR_CODES.NOT_FOUND);
    }

    doctorProfile.isApproved = isApproved;
    await doctorProfile.save();

    logger.info(`Doctor application ${doctorProfileId} review status updated to isApproved=${isApproved}`);

    return {
      doctorProfile,
      message: isApproved
        ? 'Doctor application approved successfully.'
        : `Doctor application rejected. Reason: ${reason || 'Not specified'}`,
    };
  }

  /**
   * Platform Admin: List pending independent doctor applications
   */
  async listPendingApplications({ page = 1, limit = 10 }) {
    const query = {
      clinicId: null,
      isApproved: false,
    };

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [applications, total] = await Promise.all([
      DoctorProfile.find(query)
        .populate('userId', 'name email phone createdAt')
        .populate('specializationId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      DoctorProfile.countDocuments(query),
    ]);

    return {
      applications,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Clinic Admin: Add doctor to own clinic (Auto-Approved per PRD/Architecture 7.8)
   */
  async clinicAdminAddDoctor({ clinicId, name, email, password, phone, specializationId, qualifications = [], bio, consultationFee = 500, yearsExperience = 0, experienceYears }) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS);
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      throw new NotFoundError('Clinic not found', ERROR_CODES.CLINIC_NOT_FOUND);
    }

    let spec = null;
    if (specializationId) {
      if (mongoose.Types.ObjectId.isValid(specializationId)) {
        spec = await Specialization.findById(specializationId);
      }
      if (!spec) {
        spec = await Specialization.findOne({ name: new RegExp(`^${specializationId}$`, 'i') });
      }
    }
    if (!spec) {
      spec = await Specialization.findOne({ name: /general/i }) || await Specialization.findOne({});
    }
    if (!spec) {
      throw new NotFoundError('Specialization not found', ERROR_CODES.NOT_FOUND);
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null,
      role: ROLES.DOCTOR,
      clinicId: clinic._id,
      status: USER_STATUS.ACTIVE,
    });

    const parsedQualifications = Array.isArray(qualifications)
      ? qualifications
      : typeof qualifications === 'string'
      ? qualifications.split(',').map((q) => q.trim()).filter((q) => q.length > 0)
      : [];

    const effectiveYears = parseInt(yearsExperience ?? experienceYears, 10) || 0;

    const doctorProfile = await DoctorProfile.create({
      userId: user._id,
      clinicId: clinic._id,
      specializationId: spec._id,
      qualifications: parsedQualifications.length > 0 ? parsedQualifications : ['MBBS'],
      bio: bio || '',
      consultationFee: parseFloat(consultationFee) || 500,
      feeCurrency: 'INR',
      yearsExperience: effectiveYears,
      isApproved: true, // Auto-approved under vetted clinic
      status: 'active',
    });

    logger.info(`Clinic Admin added doctor: ${user.email} under clinic ${clinic.name}`);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        clinicId: user.clinicId,
      },
      doctorProfile,
    };
  }

  /**
   * Clinic Admin: List doctors strictly belonging to their clinic
   */
  async clinicAdminListDoctors({ clinicId, page = 1, limit = 10, search }) {
    const query = { clinicId: new mongoose.Types.ObjectId(clinicId) };

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      query.userId = { $in: matchingUsers.map((u) => u._id) };
    }

    const [doctors, total] = await Promise.all([
      DoctorProfile.find(query)
        .populate('userId', 'name email phone status profilePhotoUrl')
        .populate('specializationId', 'name iconName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      DoctorProfile.countDocuments(query),
    ]);

    return {
      doctors,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Update doctor profile details
   */
  async updateDoctorProfile(doctorId, updateData, userRole, userClinicId) {
    const doctorProfile = await DoctorProfile.findById(doctorId);
    if (!doctorProfile) {
      throw new NotFoundError('Doctor profile not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    // Clinic Admin scope check
    if (userRole === ROLES.CLINIC_ADMIN) {
      if (!doctorProfile.clinicId || doctorProfile.clinicId.toString() !== userClinicId.toString()) {
        throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'Cannot modify doctor of another clinic');
      }
    }

    if (updateData.title !== undefined) doctorProfile.title = updateData.title;
    if (updateData.consultationFee !== undefined) doctorProfile.consultationFee = updateData.consultationFee;
    if (updateData.bio !== undefined) doctorProfile.bio = updateData.bio;
    if (updateData.qualifications !== undefined) doctorProfile.qualifications = updateData.qualifications;
    if (updateData.yearsExperience !== undefined) doctorProfile.yearsExperience = updateData.yearsExperience;
    if (updateData.experienceYears !== undefined) doctorProfile.yearsExperience = updateData.experienceYears;
    if (updateData.licenseNumber !== undefined) doctorProfile.licenseNumber = updateData.licenseNumber;
    if (updateData.clinicAddress !== undefined) doctorProfile.clinicAddress = updateData.clinicAddress;
    if (updateData.autoAcceptAppointments !== undefined) {
      doctorProfile.manualApprovalMode = !updateData.autoAcceptAppointments;
    }
    if (updateData.manualApprovalMode !== undefined) doctorProfile.manualApprovalMode = updateData.manualApprovalMode;
    if (updateData.status !== undefined) {
      doctorProfile.status = updateData.status;
      doctorProfile.isApproved = updateData.status === 'active';
      if (doctorProfile.userId) {
        await User.findByIdAndUpdate(doctorProfile.userId, {
          status: updateData.status === 'active' ? USER_STATUS.ACTIVE : USER_STATUS.DEACTIVATED,
        });
      }
    }

    await doctorProfile.save();
    return this.getDoctorProfile(doctorProfile._id);
  }
}

export const doctorService = new DoctorService();
export default doctorService;
