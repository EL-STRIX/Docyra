import mongoose from 'mongoose';
import { AvailabilityRule, AppointmentSlot, DoctorProfile, SystemSettings } from '../models/index.js';
import { NotFoundError, ForbiddenError, AppError } from '../utils/AppError.js';
import { ERROR_CODES, ROLES } from '../config/constants.js';
import logger from '../utils/logger.js';

class SlotService {
  /**
   * Set or update doctor availability rules
   * @param {string} doctorId - DoctorProfile ID
   * @param {Array} rules - Array of availability rule objects
   * @param {Object} currentUser - Authenticated user object (req.user)
   */
  async setDoctorAvailability(doctorId, rules, currentUser) {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    // Check authorization: Admin, or Doctor owner, or Clinic Admin of this doctor's clinic
    const isPlatformAdmin = currentUser.role === ROLES.ADMIN;
    const isSelfDoctor = currentUser.role === ROLES.DOCTOR && doctor.userId.toString() === currentUser.id;
    const isDoctorClinicAdmin =
      currentUser.role === ROLES.CLINIC_ADMIN &&
      doctor.clinicId &&
      currentUser.clinicId &&
      doctor.clinicId.toString() === currentUser.clinicId.toString();

    if (!isPlatformAdmin && !isSelfDoctor && !isDoctorClinicAdmin) {
      throw new ForbiddenError(
        'You do not have permission to modify availability for this doctor',
        ERROR_CODES.FORBIDDEN
      );
    }

    // Deactivate previous rules
    await AvailabilityRule.deleteMany({ doctorId: doctor._id });

    // Insert new rules
    const rulesToInsert = rules.map((r) => ({
      doctorId: doctor._id,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMinutes: r.slotDurationMinutes || 30,
      isActive: r.isActive !== undefined ? r.isActive : true,
    }));

    const createdRules = await AvailabilityRule.insertMany(rulesToInsert);

    logger.info(`Updated availability rules for doctor ${doctor._id} (${createdRules.length} rules)`);

    // Trigger slot generation for the rolling window
    const generationResult = await this.generateSlotsForDoctor(doctor._id);

    return {
      rules: createdRules,
      slotGeneration: generationResult,
    };
  }

  /**
   * Get active availability rules for a doctor
   */
  async getDoctorAvailability(doctorId) {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const rules = await AvailabilityRule.find({
      doctorId: doctor._id,
      isActive: true,
    })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    return rules;
  }

  /**
   * Generate slots for a single doctor across a rolling forward window (default 60 days)
   * Idempotent: safe to re-run multiple times without duplicate creation or overriding booked slots
   */
  async generateSlotsForDoctor(doctorId, { daysAhead, startDate = new Date() } = {}) {
    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    const settings = await SystemSettings.getSettings();
    const windowDays = daysAhead || settings.maxAdvanceBookingDays || 60;
    const defaultDuration = settings.defaultSlotDurationMinutes || 30;

    // Fetch active availability rules
    const rules = await AvailabilityRule.find({
      doctorId: doctor._id,
      isActive: true,
    }).lean();

    if (!rules || rules.length === 0) {
      return {
        doctorId: doctor._id,
        slotsProcessed: 0,
        message: 'No active availability rules configured for doctor',
      };
    }

    // Group rules by day of week (0 to 6)
    const rulesByDay = {};
    for (let d = 0; d <= 6; d++) {
      rulesByDay[d] = [];
    }
    rules.forEach((rule) => {
      if (rulesByDay[rule.dayOfWeek]) {
        rulesByDay[rule.dayOfWeek].push(rule);
      }
    });

    const now = new Date();
    const bulkOps = [];

    // Loop through each day from startDate up to windowDays
    const startDay = new Date(startDate);
    startDay.setUTCHours(0, 0, 0, 0);

    for (let offset = 0; offset < windowDays; offset++) {
      const currentDay = new Date(startDay);
      currentDay.setUTCDate(startDay.getUTCDate() + offset);

      const dayOfWeek = currentDay.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const dayRules = rulesByDay[dayOfWeek] || [];

      for (const rule of dayRules) {
        const slotDuration = rule.slotDurationMinutes || defaultDuration;

        const [startHour, startMinute] = rule.startTime.split(':').map(Number);
        const [endHour, endMinute] = rule.endTime.split(':').map(Number);

        const ruleStartTotalMinutes = startHour * 60 + startMinute;
        const ruleEndTotalMinutes = endHour * 60 + endMinute;

        let currentSlotMinutes = ruleStartTotalMinutes;

        while (currentSlotMinutes + slotDuration <= ruleEndTotalMinutes) {
          const slotStart = new Date(currentDay);
          const startH = Math.floor(currentSlotMinutes / 60);
          const startM = currentSlotMinutes % 60;
          slotStart.setUTCHours(startH, startM, 0, 0);

          const slotEnd = new Date(currentDay);
          const endSlotMinutes = currentSlotMinutes + slotDuration;
          const endH = Math.floor(endSlotMinutes / 60);
          const endM = endSlotMinutes % 60;
          slotEnd.setUTCHours(endH, endM, 0, 0);

          // Only generate slots in the future
          if (slotStart > now) {
            bulkOps.push({
              updateOne: {
                filter: {
                  doctorId: doctor._id,
                  slotStart,
                  slotEnd,
                },
                update: {
                  $setOnInsert: {
                    doctorId: doctor._id,
                    availabilityRuleId: rule._id,
                    slotStart,
                    slotEnd,
                    isBooked: false,
                  },
                },
                upsert: true,
              },
            });
          }

          currentSlotMinutes += slotDuration;
        }
      }
    }

    if (bulkOps.length === 0) {
      return {
        doctorId: doctor._id,
        slotsProcessed: 0,
        message: 'No upcoming future slots to generate',
      };
    }

    // Execute in batches of 500 to keep memory low
    const BATCH_SIZE = 500;
    let upsertedCount = 0;
    let matchedCount = 0;

    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
      const batch = bulkOps.slice(i, i + BATCH_SIZE);
      const res = await AppointmentSlot.bulkWrite(batch, { ordered: false });
      upsertedCount += res.upsertedCount || 0;
      matchedCount += res.matchedCount || 0;
    }

    logger.info(
      `Slot generation for doctor ${doctor._id}: ${upsertedCount} new slots created, ${matchedCount} existing slots retained.`
    );

    return {
      doctorId: doctor._id,
      totalSlotsEvaluated: bulkOps.length,
      newSlotsCreated: upsertedCount,
      existingSlotsRetained: matchedCount,
    };
  }

  /**
   * Platform-wide slot generation for all active and approved doctors
   */
  async generateSlotsForAllDoctors() {
    logger.info('Starting nightly slot generation job for all approved doctors...');
    const doctors = await DoctorProfile.find({ isApproved: true }).select('_id');

    const results = [];
    let totalCreated = 0;

    for (const doctor of doctors) {
      try {
        const res = await this.generateSlotsForDoctor(doctor._id);
        results.push(res);
        totalCreated += res.newSlotsCreated || 0;
      } catch (err) {
        logger.error(`Error generating slots for doctor ${doctor._id}: ${err.message}`);
      }
    }

    logger.info(
      `Slot generation completed. Processed ${doctors.length} doctors, created ${totalCreated} new slots.`
    );

    return {
      doctorsProcessed: doctors.length,
      totalNewSlotsCreated: totalCreated,
      doctorResults: results,
    };
  }

  /**
   * Public: Query available open slots for a specific doctor on a given date (YYYY-MM-DD)
   */
  async getAvailableSlots({ doctorId, date, timezone = 'UTC' }) {
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Invalid doctor ID format');
    }

    const doctor = await DoctorProfile.findById(doctorId).populate('userId', 'name');
    if (!doctor || !doctor.isApproved) {
      throw new NotFoundError('Doctor not found or not approved', ERROR_CODES.DOCTOR_NOT_FOUND);
    }

    // Parse YYYY-MM-DD
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, 'Invalid date format. Expected YYYY-MM-DD');
    }

    // Define UTC boundaries for the queried date
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const now = new Date();

    const slots = await AppointmentSlot.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      isBooked: false,
      slotStart: {
        $gte: startOfDay,
        $lte: endOfDay,
        $gt: now, // Do not return slots in the past
      },
    })
      .sort({ slotStart: 1 })
      .lean();

    return {
      doctorId,
      doctorName: doctor.userId?.name || 'Doctor',
      date,
      timezone,
      availableSlotCount: slots.length,
      slots: slots.map((s) => ({
        _id: s._id,
        slotStart: s.slotStart,
        slotEnd: s.slotEnd,
        isBooked: s.isBooked,
      })),
    };
  }
}

export const slotService = new SlotService();
export default slotService;
