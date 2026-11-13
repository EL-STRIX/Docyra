import { slotService } from '../services/slotService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { NotFoundError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Doctor / Clinic Admin / Platform Admin: Set doctor weekly availability rules
 */
export const setDoctorAvailability = asyncHandler(async (req, res) => {
  let { id } = req.params;
  if (id === 'me') {
    const profile = await DoctorProfile.findOne({ userId: req.user._id || req.user.id });
    if (!profile) {
      throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
    }
    id = profile._id.toString();
  }

  let { rules, weeklySchedule, slotDurationMinutes } = req.body;

  if ((!rules || rules.length === 0) && Array.isArray(weeklySchedule)) {
    rules = [];
    const duration = slotDurationMinutes || 30;
    for (const day of weeklySchedule) {
      if (day.isActive && Array.isArray(day.slots)) {
        for (const s of day.slots) {
          if (s.start && s.end) {
            rules.push({
              dayOfWeek: day.dayOfWeek,
              startTime: s.start,
              endTime: s.end,
              slotDurationMinutes: duration,
              isActive: true,
            });
          }
        }
      }
    }
  }

  const result = await slotService.setDoctorAvailability(id, rules, req.user);

  res.status(200).json({
    success: true,
    message: 'Availability rules updated and slots generated successfully',
    data: result,
  });
});

/**
 * Get active doctor availability rules
 */
export const getDoctorAvailability = asyncHandler(async (req, res) => {
  let { id } = req.params;
  if (id === 'me') {
    const profile = await DoctorProfile.findOne({ userId: req.user._id || req.user.id });
    if (!profile) {
      throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
    }
    id = profile._id.toString();
  }

  const rules = await slotService.getDoctorAvailability(id);

  // Construct weeklySchedule from rules
  const dayMap = {};
  for (let i = 0; i <= 6; i++) {
    dayMap[i] = { dayOfWeek: i, isActive: false, slots: [] };
  }
  let slotDurationMinutes = 30;
  for (const r of rules) {
    if (r.slotDurationMinutes) slotDurationMinutes = r.slotDurationMinutes;
    if (r.isActive) {
      dayMap[r.dayOfWeek].isActive = true;
      dayMap[r.dayOfWeek].slots.push({ start: r.startTime, end: r.endTime });
    }
  }
  const weeklySchedule = Object.values(dayMap);

  res.status(200).json({
    success: true,
    data: {
      rules,
      weeklySchedule,
      slotDurationMinutes,
    },
  });
});

/**
 * Public: Get available slots for a doctor on a specific date (YYYY-MM-DD)
 */
export const getDoctorSlots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, timezone } = req.query;

  const result = await slotService.getAvailableSlots({
    doctorId: id,
    date,
    timezone,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export default {
  setDoctorAvailability,
  getDoctorAvailability,
  getDoctorSlots,
};
