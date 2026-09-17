const { Waitlist } = require('../models');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');
const logger = require('../utils/logger');
const systemSettingsService = require('./systemSettingsService');

class WaitlistService {
  /**
   * Patient: Join waitlist for doctor & date range (P-6a)
   */
  async joinWaitlist({ patientId, doctorId, desiredDateRangeStart, desiredDateRangeEnd }) {
    if (!doctorId || !desiredDateRangeStart || !desiredDateRangeEnd) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Doctor ID and desired date range are required');
    }

    const startDate = new Date(desiredDateRangeStart);
    const endDate = new Date(desiredDateRangeEnd);

    if (startDate > endDate) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'desiredDateRangeStart must be before desiredDateRangeEnd');
    }

    // Check if already in waitlist for this doctor & overlapping range
    const existing = await Waitlist.findOne({
      patientId,
      doctorId,
      status: 'waiting',
      desiredDateRangeStart: { $lte: endDate },
      desiredDateRangeEnd: { $gte: startDate }
    });

    if (existing) {
      throw AppError.conflict(ERROR_CODES.CONFLICT, 'You are already on the active waitlist for this doctor and date range');
    }

    const entry = await Waitlist.create({
      patientId,
      doctorId,
      desiredDateRangeStart: startDate,
      desiredDateRangeEnd: endDate,
      status: 'waiting'
    });

    logger.info(`📋 [WaitlistService] Patient ${patientId} joined waitlist for Doctor ${doctorId}`);
    return entry;
  }

  /**
   * Patient: Get own active waitlist entries
   */
  async getPatientWaitlist(patientId) {
    return Waitlist.find({ patientId })
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });
  }

  /**
   * Patient: Leave waitlist
   */
  async leaveWaitlist(patientId, waitlistId) {
    const entry = await Waitlist.findOneAndDelete({ _id: waitlistId, patientId });
    if (!entry) {
      throw AppError.notFound(ERROR_CODES.NOT_FOUND, 'Waitlist entry not found');
    }
    return entry;
  }

  /**
   * FIFO Slot Available Trigger on Cancellation (architecture Section 7.6)
   */
  async triggerSlotAvailable(doctorId, slotStart) {
    const targetDate = new Date(slotStart);

    // Find earliest waitlisted patient (FIFO by createdAt: 1)
    const earliestEntry = await Waitlist.findOne({
      doctorId,
      status: 'waiting',
      desiredDateRangeStart: { $lte: targetDate },
      desiredDateRangeEnd: { $gte: targetDate }
    })
      .sort({ createdAt: 1 })
      .populate('patientId', 'name email phone');

    if (earliestEntry) {
      const settings = await systemSettingsService.getSettings();
      const claimWindowMinutes = settings.waitlistClaimWindowMinutes || 30;

      earliestEntry.status = 'notified';
      earliestEntry.notifiedAt = new Date();
      earliestEntry.claimExpiresAt = new Date(Date.now() + claimWindowMinutes * 60 * 1000);
      await earliestEntry.save();

      logger.info(`📢 [WaitlistService] FIFO Waitlist Match: Notifying patient ${earliestEntry.patientId.email} for Doctor ${doctorId} slot on ${slotStart}`);
      return earliestEntry;
    }

    return null;
  }
}

module.exports = new WaitlistService();
