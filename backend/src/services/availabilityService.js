const { AvailabilityRule, AppointmentSlot, DoctorProfile } = require('../models');
const AppError = require('../utils/AppError');
const { ERROR_CODES } = require('../config/constants');
const systemSettingsService = require('./systemSettingsService');
const logger = require('../utils/logger');

class AvailabilityService {
  /**
   * Get active availability rules for a doctor
   */
  async getDoctorAvailability(doctorId) {
    return AvailabilityRule.find({ doctorId, isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
  }

  /**
   * Update doctor availability rules and regenerate slots
   */
  async setDoctorAvailability(doctorId, rules) {
    const settings = await systemSettingsService.getSettings();
    const defaultDuration = settings.defaultSlotDurationMinutes || 30;

    // Remove existing rules
    await AvailabilityRule.deleteMany({ doctorId });

    const formattedRules = rules.map(rule => {
      // Validate time format (HH:mm)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(rule.startTime) || !timeRegex.test(rule.endTime)) {
        throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Invalid time format. Expected HH:mm');
      }

      if (rule.startTime >= rule.endTime) {
        throw AppError.badRequest(ERROR_CODES.INVALID_SLOT_RANGE, 'startTime must be strictly before endTime');
      }

      return {
        doctorId,
        dayOfWeek: parseInt(rule.dayOfWeek, 10),
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotDurationMinutes: rule.slotDurationMinutes || defaultDuration,
        isActive: rule.isActive !== false
      };
    });

    const createdRules = await AvailabilityRule.insertMany(formattedRules);

    // Regenerate upcoming slots for next 60 days
    await this.generateSlotsForDoctor(doctorId, 60);

    return createdRules;
  }

  /**
   * Get available (unbooked) slots for a specific doctor on a date
   */
  async getAvailableSlots(doctorId, dateString) {
    if (!dateString) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Query parameter "date" (YYYY-MM-DD) is required');
    }

    const dateParts = dateString.split('-');
    if (dateParts.length !== 3) {
      throw AppError.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Invalid date format. Expected YYYY-MM-DD');
    }

    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    const slots = await AppointmentSlot.find({
      doctorId,
      slotStart: { $gte: startOfDay, $lte: endOfDay },
      isBooked: false
    }).sort({ slotStart: 1 });

    return slots;
  }

  /**
   * Idempotent slot generation for a single doctor (60-day horizon)
   */
  async generateSlotsForDoctor(doctorId, horizonDays = 60) {
    const rules = await AvailabilityRule.find({ doctorId, isActive: true });
    if (!rules || rules.length === 0) return 0;

    const operations = [];
    const today = new Date();

    for (let dayOffset = 0; dayOffset < horizonDays; dayOffset++) {
      const targetDate = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() + dayOffset
      ));
      const dayOfWeek = targetDate.getUTCDay();

      const matchingRules = rules.filter(r => r.dayOfWeek === dayOfWeek);

      for (const rule of matchingRules) {
        const [startH, startM] = rule.startTime.split(':').map(Number);
        const [endH, endM] = rule.endTime.split(':').map(Number);

        let currentMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const duration = rule.slotDurationMinutes;

        while (currentMinutes + duration <= endMinutes) {
          const slotStartH = Math.floor(currentMinutes / 60);
          const slotStartM = currentMinutes % 60;

          const slotEndH = Math.floor((currentMinutes + duration) / 60);
          const slotEndM = (currentMinutes + duration) % 60;

          const slotStart = new Date(Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth(),
            targetDate.getUTCDate(),
            slotStartH,
            slotStartM,
            0,
            0
          ));

          const slotEnd = new Date(Date.UTC(
            targetDate.getUTCFullYear(),
            targetDate.getUTCMonth(),
            targetDate.getUTCDate(),
            slotEndH,
            slotEndM,
            0,
            0
          ));

          // Upsert to preserve idempotency (R7.1, never overwrite isBooked true)
          operations.push({
            updateOne: {
              filter: {
                doctorId,
                slotStart,
                slotEnd
              },
              update: {
                $setOnInsert: {
                  doctorId,
                  availabilityRuleId: rule._id,
                  slotStart,
                  slotEnd,
                  isBooked: false
                }
              },
              upsert: true
            }
          });

          currentMinutes += duration;
        }
      }
    }

    if (operations.length > 0) {
      const result = await AppointmentSlot.bulkWrite(operations, { ordered: false });
      return result.upsertedCount;
    }
    return 0;
  }

  /**
   * Nightly generation job for all approved doctors
   */
  async generateAllSlots(horizonDays = 60) {
    const doctors = await DoctorProfile.find({ isApproved: true });
    logger.info(`🔄 [AvailabilityService] Starting slot generation for ${doctors.length} approved doctors...`);

    let totalCreated = 0;
    for (const doc of doctors) {
      const count = await this.generateSlotsForDoctor(doc.userId, horizonDays);
      totalCreated += count;
    }

    logger.info(`✅ [AvailabilityService] Completed slot generation. Total new slots created: ${totalCreated}`);
    return totalCreated;
  }
}

module.exports = new AvailabilityService();
