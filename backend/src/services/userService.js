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
}

export const userService = new UserService();
export default userService;
