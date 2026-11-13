import { User, Dependent, Appointment, Review, Waitlist, AuditLog, DoctorProfile } from '../models/index.js';
import { NotFoundError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';
import logger from '../utils/logger.js';

class UserService {
  /**
   * Helper: sanitize user object
   */
  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.passwordHash;
    delete userObj.twoFactorSecret;
    delete userObj.__v;
    return userObj;
  }

  /**
   * Export all user data (GDPR Right to Data Portability)
   */
  async exportUserData(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    const [dependents, appointments, reviews, waitlistEntries, auditLogs, doctorProfile] = await Promise.all([
      Dependent.find({ patientId: userId }).lean(),
      Appointment.find({
        $or: [{ patientId: userId }, { doctorId: userId }],
      })
        .populate('clinicId', 'name address city contactEmail contactPhone')
        .lean(),
      Review.find({
        $or: [{ patientId: userId }, { doctorId: userId }],
      }).lean(),
      Waitlist.find({ patientId: userId }).lean(),
      AuditLog.find({ actorId: userId }).lean(),
      DoctorProfile.findOne({ userId }).populate('specializationId', 'name description').lean(),
    ]);

    logger.info(`GDPR data export generated for user: ${user.email}`);

    return {
      exportTimestamp: new Date().toISOString(),
      platform: 'Docyra',
      gdprArticle: 'Article 20 - Right to data portability',
      user: this.sanitizeUser(user),
      doctorProfile: doctorProfile || null,
      dependents,
      appointments,
      reviews,
      waitlistEntries,
      auditLogs,
    };
  }

  /**
   * Update terms & privacy consent version
   */
  async updateConsent(userId, termsVersion) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    user.acceptedTermsVersion = termsVersion;
    user.acceptedTermsAt = new Date();
    await user.save();

    logger.info(`User ${user.email} updated consent to version ${termsVersion}`);

    return {
      success: true,
      message: 'Terms of service consent updated successfully',
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Update profile information
   */
  async updateProfile(userId, { name, phone, timezone, profilePhotoUrl }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (timezone) user.timezone = timezone;
    if (profilePhotoUrl !== undefined) user.profilePhotoUrl = profilePhotoUrl;

    await user.save();
    return {
      user: this.sanitizeUser(user),
    };
  }

  /**
   * List users with search, role filter, status filter, and pagination (Admin / Operations)
   */
  async listUsers({ role, status, search, page = 1, limit = 20 }) {
    await this.seedSamplePatientsIfFew();

    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [users, total, totalCount, activeCount, suspendedCount] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({ role: role || 'patient' }),
      User.countDocuments({ role: role || 'patient', status: 'active' }),
      User.countDocuments({ role: role || 'patient', status: 'suspended' }),
    ]);

    const userIds = users.map((u) => u._id);

    // Fetch dependent and appointment counts
    const [aptCounts, depCounts] = await Promise.all([
      Appointment.aggregate([
        { $match: { patientId: { $in: userIds } } },
        { $group: { _id: '$patientId', count: { $sum: 1 } } },
      ]),
      Dependent.aggregate([
        { $match: { patientId: { $in: userIds } } },
        { $group: { _id: '$patientId', count: { $sum: 1 } } },
      ]),
    ]);

    const aptMap = {};
    aptCounts.forEach((a) => {
      aptMap[a._id.toString()] = a.count;
    });

    const depMap = {};
    depCounts.forEach((d) => {
      depMap[d._id.toString()] = d.count;
    });

    const enrichedUsers = users.map((u) => {
      const idStr = u._id.toString();
      const isAct = u.status === 'active';
      return {
        ...this.sanitizeUser(u),
        id: idStr,
        isTwoFactorEnabled: Boolean(u.twoFactorEnabled),
        isEmailVerified: Boolean(u.emailVerifiedAt),
        isActive: isAct,
        appointmentsCount: aptMap[idStr] || 0,
        dependentsCount: depMap[idStr] || 0,
      };
    });

    return {
      users: enrichedUsers,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
        stats: {
          totalPatients: totalCount,
          activePatients: activeCount,
          suspendedPatients: suspendedCount,
        },
      },
    };
  }

  /**
   * Update user status (Activate / Suspend)
   */
  async updateUserStatus(userId, status, actor = null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    user.status = status;
    await user.save();

    logger.info(`User ${user.email} status changed to ${status} by ${actor?.email || 'Admin'}`);

    return {
      ...this.sanitizeUser(user),
      isTwoFactorEnabled: Boolean(user.twoFactorEnabled),
      isEmailVerified: Boolean(user.emailVerifiedAt),
      isActive: user.status === 'active',
    };
  }

  /**
   * Get comprehensive patient profile with dependents and appointment timeline
   */
  async getUserDetail(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.NOT_FOUND);
    }

    const [dependents, appointments] = await Promise.all([
      Dependent.find({ patientId: userId }).lean(),
      Appointment.find({ patientId: userId })
        .populate('clinicId', 'name city address contactPhone')
        .populate('doctorId', 'name email')
        .sort({ slotStart: -1 })
        .limit(10)
        .lean(),
    ]);

    return {
      user: {
        ...this.sanitizeUser(user),
        isTwoFactorEnabled: Boolean(user.twoFactorEnabled),
        isEmailVerified: Boolean(user.emailVerifiedAt),
        isActive: user.status === 'active',
      },
      dependents,
      appointments,
    };
  }

  /**
   * Ensure sample patient cohort exists for rich management demo
   */
  async seedSamplePatientsIfFew() {
    try {
      const patientCount = await User.countDocuments({ role: 'patient' });
      if (patientCount >= 5) return;

      const samplePatients = [
        {
          name: 'Aarav Patel',
          email: 'aarav.patel@example.com',
          phone: '+91 98201 12345',
          status: 'active',
          role: 'patient',
          twoFactorEnabled: true,
          emailVerifiedAt: new Date(),
          acceptedTermsVersion: '1.0',
        },
        {
          name: 'Ananya Sen',
          email: 'ananya.sen@example.com',
          phone: '+91 98310 54321',
          status: 'active',
          role: 'patient',
          twoFactorEnabled: false,
          emailVerifiedAt: new Date(),
          acceptedTermsVersion: '1.0',
        },
        {
          name: 'Rahul Verma',
          email: 'rahul.verma@example.com',
          phone: '+91 98450 99887',
          status: 'suspended',
          role: 'patient',
          twoFactorEnabled: false,
          emailVerifiedAt: new Date(),
          acceptedTermsVersion: '1.0',
        },
        {
          name: 'Kavita Menon',
          email: 'kavita.menon@example.com',
          phone: '+91 94470 33221',
          status: 'active',
          role: 'patient',
          twoFactorEnabled: true,
          emailVerifiedAt: new Date(),
          acceptedTermsVersion: '1.0',
        },
      ];

      for (const p of samplePatients) {
        const existing = await User.findOne({ email: p.email });
        if (!existing) {
          await User.create({
            ...p,
            passwordHash: '$2b$12$eXoPzKkS3WfW8fP2wE6Dpe7wQY.UeTf8uR9gP2i7jN1f6s9jX.7O2', // Password@123
          });
        }
      }
    } catch (err) {
      logger.warn(`Could not seed sample patients: ${err.message}`);
    }
  }
}

export const userService = new UserService();
export default userService;
