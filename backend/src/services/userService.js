const { User, Appointment, Dependent, Review, AuditLog } = require('../models');
const AppError = require('../utils/AppError');
const { ERROR_CODES, USER_STATUS } = require('../config/constants');
const auditService = require('./auditService');
const logger = require('../utils/logger');

class UserService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const allowedFields = ['name', 'phone', 'profilePhotoUrl', 'timezone'];
    const filteredUpdate = {};

    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        filteredUpdate[key] = updateData[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, filteredUpdate, {
      new: true,
      runValidators: true
    });

    if (!user) {
      throw AppError.notFound(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    }

    return user;
  }

  /**
   * GDPR: Complete Personal Data Export (TRD Section 7, Phase 9)
   */
  async exportUserData(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    }

    const [appointments, dependents, reviews, auditLogs] = await Promise.all([
      Appointment.find({ patientId: userId })
        .populate('doctorId', 'name email')
        .populate('clinicId', 'name address city')
        .lean(),
      Dependent.find({ patientId: userId }).lean(),
      Review.find({ patientId: userId }).lean(),
      AuditLog.find({ actorId: userId }).lean()
    ]);

    const exportBundle = {
      exportGeneratedAt: new Date().toISOString(),
      disclaimer: 'Docyra GDPR / Data Privacy Subject Access Export',
      userProfile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        status: user.status,
        timezone: user.timezone,
        emailVerifiedAt: user.emailVerifiedAt,
        acceptedTermsVersion: user.acceptedTermsVersion,
        acceptedTermsAt: user.acceptedTermsAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      dependents,
      appointments,
      reviews,
      auditHistory: auditLogs
    };

    await auditService.log({
      actorId: userId,
      actorRole: user.role,
      action: 'GDPR_DATA_EXPORT',
      targetType: 'User',
      targetId: userId,
      metadata: { itemsExported: { appointments: appointments.length, dependents: dependents.length, reviews: reviews.length } }
    });

    logger.info(`📦 [UserService] Completed GDPR data export for user ${userId}`);
    return exportBundle;
  }

  /**
   * GDPR / Account Deletion Request
   */
  async deleteAccount(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw AppError.notFound(ERROR_CODES.USER_NOT_FOUND, 'User not found');
    }

    // Soft delete / anonymize user
    user.status = USER_STATUS.DEACTIVATED;
    user.email = `deleted_${userId}_${Date.now()}@anonymized.docyra.app`;
    user.name = 'Deactivated User';
    user.phone = null;
    user.profilePhotoUrl = null;
    await user.save();

    await auditService.log({
      actorId: userId,
      actorRole: user.role,
      action: 'ACCOUNT_DEACTIVATED',
      targetType: 'User',
      targetId: userId
    });

    return { message: 'Account successfully deactivated and anonymized per GDPR retention guidelines' };
  }
}

module.exports = new UserService();
