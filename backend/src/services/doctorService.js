import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User, DoctorProfile, Clinic, Specialization, AvailabilityRule, Appointment } from '../models/index.js';
import { ROLES, USER_STATUS, ERROR_CODES, APPOINTMENT_STATUS } from '../config/constants.js';
import { env } from '../config/env.js';
import { NotFoundError, ConflictError, AppError } from '../utils/AppError.js';
import storageService from './storageService.js';
import notificationService from './notificationService.js';
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

    const parsedLimit = parseInt(limit, 10);
    const safeLimit = limit === 'all' || limit === 0 ? 1000 : Math.min(Math.max(parsedLimit || 10, 1), 1000);
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
      {
        $unwind: {
          path: '$specialization',
          preserveNullAndEmptyArrays: true,
        },
      },
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
          title: { $ifNull: ['$title', 'Dr.'] },
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
            $cond: [
              { $ifNull: ['$specialization._id', false] },
              {
                _id: '$specialization._id',
                name: '$specialization.name',
                iconName: '$specialization.iconName',
              },
              null,
            ],
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
    const doctor = await DoctorProfile.findOne({ userId });
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
    }
    return this.getDoctorProfile(doctor._id);
  }

  /**
   * Public / Clinic Admin: Get doctor profile detail by ID with real-time stats
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
    let slotDurationMinutes = doctor.slotDurationMinutes || null;
    for (const r of rules) {
      if (r.slotDurationMinutes) slotDurationMinutes = r.slotDurationMinutes;
      dayMap[r.dayOfWeek].isActive = true;
      dayMap[r.dayOfWeek].slots.push({ start: r.startTime, end: r.endTime });
    }
    const weeklySchedule = Object.values(dayMap);
    const hasActiveSchedule = weeklySchedule.some((day) => day.isActive && day.slots.length > 0);

    // Real-time clinical activity metrics from live appointments
    const [totalAppointments, completedAppointments, upcomingAppointments, completedApts] = await Promise.all([
      Appointment.countDocuments({ doctorId: doctor._id }),
      Appointment.countDocuments({ doctorId: doctor._id, status: APPOINTMENT_STATUS.COMPLETED }),
      Appointment.countDocuments({
        doctorId: doctor._id,
        status: { $in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.PENDING] },
        slotStart: { $gte: new Date() },
      }),
      Appointment.find({ doctorId: doctor._id, status: APPOINTMENT_STATUS.COMPLETED }).select('consultationFee').lean(),
    ]);

    const totalRevenueGenerated = completedApts.reduce(
      (sum, a) => sum + (a.consultationFee !== undefined && a.consultationFee !== null ? a.consultationFee : (doctor.consultationFee || 0)),
      0
    );

    return {
      ...doctor,
      name: doctor.userId?.name || doctor.name || '',
      email: doctor.userId?.email || doctor.email || '',
      phone: doctor.userId?.phone || doctor.phone || '',
      profilePhotoUrl: doctor.userId?.profilePhotoUrl || doctor.profilePhotoUrl || null,
      experienceYears: doctor.yearsExperience ?? doctor.experienceYears ?? null,
      yearsExperience: doctor.yearsExperience ?? doctor.experienceYears ?? null,
      weeklySchedule,
      hasActiveSchedule,
      slotDurationMinutes: slotDurationMinutes || doctor.slotDurationMinutes || null,
      autoAcceptAppointments: !doctor.manualApprovalMode,
      realtimeStats: {
        totalAppointments,
        completedAppointments,
        upcomingAppointments,
        totalRevenueGenerated,
      },
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

    let clinic = null;
    if (clinicId) {
      clinic = await Clinic.findById(clinicId);
      if (!clinic) {
        throw new NotFoundError('Selected clinic not found', ERROR_CODES.NOT_FOUND);
      }
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
      clinicId: clinic ? clinic._id : null,
      status: USER_STATUS.UNVERIFIED, // Account created, but approval pending
    });

    const parsedQualifications = Array.isArray(qualifications)
      ? qualifications
      : typeof qualifications === 'string'
      ? qualifications.split(',').map((q) => q.trim())
      : [];

    const computedClinicAddress = clinic
      ? (typeof clinic.address === 'string' ? `${clinic.name}, ${clinic.address}` : `${clinic.name}, ${clinic.address?.street || ''}`)
      : (clinicAddress || 'Independent Practice');

    const doctorProfile = await DoctorProfile.create({
      userId: user._id,
      clinicId: clinic ? clinic._id : null,
      specializationId: spec._id,
      qualifications: parsedQualifications,
      bio: bio || '',
      licenseDocumentUrl,
      consultationFee: parseFloat(consultationFee) || 500,
      feeCurrency: 'INR',
      clinicAddress: computedClinicAddress || clinicAddress || (clinic ? clinic.name : 'Independent Practice'),
      yearsExperience: parseInt(yearsExperience, 10) || 0,
      isIndependent: !clinic,
      isApproved: false, // Must be approved by Clinic Admin or Platform Admin
      status: 'pending',
    });

    logger.info(`Doctor application submitted${clinic ? ` to clinic "${clinic.name}"` : ' as independent'}: ${user.email} (${doctorProfile._id})`);

    return {
      applicationId: doctorProfile._id,
      userId: user._id,
      clinicId: clinic ? clinic._id : null,
      clinicName: clinic ? clinic.name : null,
      status: 'pending_review',
      message: clinic
        ? `Application submitted successfully to ${clinic.name}. It will be reviewed by the clinic administration.`
        : 'Doctor application submitted successfully. It will be reviewed by platform administration.',
    };
  }

  /**
   * Clinic Admin: List doctor applications submitted to this clinic
   */
  async listClinicDoctorApplications({ clinicId, page = 1, limit = 10, status = 'pending' }) {
    if (!clinicId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Clinic ID is required');
    }

    const query = {
      clinicId: new mongoose.Types.ObjectId(clinicId),
    };

    if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'rejected' || status === 'suspended') {
      query.status = 'suspended';
      query.isApproved = false;
    } else if (status === 'all') {
      // Applications waiting for verification or action (exclude fully approved doctors)
      query.isApproved = false;
    } else {
      // Default: pending applications awaiting review
      query.isApproved = false;
      query.status = { $ne: 'suspended' };
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
        licenseNumber: doc.licenseNumber || '',
        licenseDocumentUrl: doc.licenseDocumentUrl,
        bio: doc.bio,
        status: appStatus,
        isApproved: !!doc.isApproved,
        interviewMeeting: doc.interviewMeeting || null,
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
   * Clinic Admin: Schedule an online negotiation meeting with applying doctor & send professional invitation email
   */
  async scheduleClinicDoctorMeeting(doctorProfileId, clinicId, { meetingDate, meetingTime, meetingLink, agenda, customNotes, scheduledBy }) {
    if (!meetingDate || !meetingTime) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Meeting date and time are required');
    }

    const doctorProfile = await DoctorProfile.findById(doctorProfileId)
      .populate('userId', 'name email phone')
      .populate('specializationId', 'name')
      .populate('clinicId', 'name email phone address contactEmail');

    if (!doctorProfile) {
      throw new NotFoundError('Doctor application not found', ERROR_CODES.NOT_FOUND);
    }

    if (doctorProfile.clinicId && doctorProfile.clinicId._id && doctorProfile.clinicId._id.toString() !== clinicId.toString()) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'You do not have permission to schedule meetings for other clinics');
    }

    const clinic = doctorProfile.clinicId || (await Clinic.findById(clinicId));
    const clinicName = clinic?.name || 'Clinic';
    const doctorName = doctorProfile.userId?.name || doctorProfile.name || 'Practitioner';
    const doctorEmail = doctorProfile.userId?.email || doctorProfile.email;
    const specName = doctorProfile.specializationId?.name || 'Medical Specialist';

    const cleanLink = meetingLink?.trim() || `https://meet.google.com/new`;
    const cleanAgenda = agenda?.trim() || 'Clinic Affiliation & Fee Discussion';

    // Format date nicely in Indian Standard Time (Asia/Kolkata)
    let formattedDate = meetingDate;
    try {
      const [y, m, d] = meetingDate.split('-');
      const dObj = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
      formattedDate = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'full',
        timeZone: 'Asia/Kolkata',
      }).format(dObj);
    } catch (e) {
      // fallback
    }

    // Save meeting record on doctorProfile
    doctorProfile.interviewMeeting = {
      meetingDate,
      meetingTime,
      meetingLink: cleanLink,
      agenda: cleanAgenda,
      notes: customNotes || '',
      scheduledAt: new Date(),
      scheduledBy: scheduledBy || null,
      emailSent: true,
      emailSentAt: new Date(),
    };
    await doctorProfile.save();

    // Send professional HTML email to doctor
    if (doctorEmail) {
      const subject = `Invitation: Online Affiliation Meeting with ${clinicName}`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden;">
          <div style="background-color: #0F5C54; padding: 24px 28px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #99F6E4; margin-bottom: 4px; font-weight: 700;">
              Docyra Healthcare Portal
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff;">
              Physician Affiliation & Practice Discussion
            </h1>
            <div style="font-size: 13px; color: #CCFBF1; margin-top: 4px;">
              ${clinicName}
            </div>
          </div>

          <div style="padding: 28px; color: #1F2937; line-height: 1.6;">
            <p style="font-size: 15px; margin-top: 0;">
              Dear <strong>Dr. ${doctorName.replace(/^dr\.?\s+/i, '')}</strong>,
            </p>
            <p style="font-size: 14px; color: #4B5563;">
              Thank you for applying to practice at <strong>${clinicName}</strong> in <strong>${specName}</strong>. 
              Our clinic administration has reviewed your application and qualifications.
            </p>
            <p style="font-size: 14px; color: #4B5563;">
              We would like to invite you to an online meeting to discuss our clinic affiliation terms, practice timings, and consultation fee structure.
            </p>

            <div style="background-color: #F0FDFA; border: 1px solid #99F6E4; border-radius: 10px; padding: 20px; margin: 24px 0;">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0F5C54; margin-bottom: 12px;">
                Scheduled Discussion Details
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #6B7280; width: 120px; font-weight: 600;">Meeting Date:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 700;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Time:</td>
                  <td style="padding: 6px 0; color: #111827; font-weight: 700;">${meetingTime} (IST)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Agenda:</td>
                  <td style="padding: 6px 0; color: #111827;">${cleanAgenda}</td>
                </tr>
                ${customNotes ? `
                <tr>
                  <td style="padding: 6px 0; color: #6B7280; font-weight: 600;">Notes:</td>
                  <td style="padding: 6px 0; color: #111827;">${customNotes}</td>
                </tr>
                ` : ''}
              </table>

              <div style="margin-top: 20px; text-align: center;">
                <a href="${cleanLink}" target="_blank" rel="noopener noreferrer" style="background-color: #0F5C54; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Join Online Video Meeting
                </a>
              </div>
              <div style="font-size: 11px; color: #6B7280; text-align: center; margin-top: 10px;">
                Meeting URL: <a href="${cleanLink}" style="color: #0F5C54;">${cleanLink}</a>
              </div>
            </div>

            <p style="font-size: 13px; color: #6B7280; margin-bottom: 0;">
              If you have any questions or require an alternate time, please reply directly to this email or reach our administration office.
            </p>
          </div>

          <div style="background-color: #F9FAFB; padding: 16px 28px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; text-align: center;">
            Sent by <strong>${clinicName}</strong> via Docyra Healthcare Platform.<br />
            Confidential physician affiliation communication.
          </div>
        </div>
      `;

      await notificationService.sendEmail({
        to: doctorEmail,
        subject,
        html,
      });
      logger.info(`Affiliation meeting invitation email sent to ${doctorEmail}`);
    }

    return {
      interviewMeeting: doctorProfile.interviewMeeting,
      message: `Meeting scheduled and invitation email sent to ${doctorEmail || 'doctor'}.`,
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

    if (doctorProfile.clinicId && doctorProfile.clinicId.toString() !== clinicId.toString()) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 403, 'You do not have permission to review applications for other clinics');
    }

    doctorProfile.isApproved = !!isApproved;
    doctorProfile.status = isApproved ? 'active' : 'suspended';
    doctorProfile.clinicId = clinicId;
    doctorProfile.isIndependent = false;
    await doctorProfile.save();

    if (doctorProfile.userId) {
      await User.findByIdAndUpdate(doctorProfile.userId._id || doctorProfile.userId, {
        status: isApproved ? USER_STATUS.ACTIVE : USER_STATUS.SUSPENDED,
        clinicId: clinicId,
      });
    }

    logger.info(`Clinic doctor application ${doctorProfileId} review updated to isApproved=${isApproved} by clinic ${clinicId}`);

    return {
      doctorProfile,
      message: isApproved
        ? 'Doctor application approved successfully. The doctor is now affiliated with your clinic and available under Manage Doctors.'
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
    const query = {
      clinicId: new mongoose.Types.ObjectId(clinicId),
      isApproved: true,
    };

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
    if (updateData.name || updateData.phone) {
      if (doctorProfile.userId) {
        const userUpdate = {};
        if (updateData.name) userUpdate.name = updateData.name;
        if (updateData.phone) userUpdate.phone = updateData.phone;
        await User.findByIdAndUpdate(doctorProfile.userId, userUpdate);
      }
    }
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
