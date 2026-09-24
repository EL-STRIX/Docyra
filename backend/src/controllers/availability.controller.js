import { slotService } from '../services/slotService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Doctor / Clinic Admin / Platform Admin: Set doctor weekly availability rules
 */
export const setDoctorAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rules } = req.body;

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
  const { id } = req.params;

  const rules = await slotService.getDoctorAvailability(id);

  res.status(200).json({
    success: true,
    data: rules,
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
