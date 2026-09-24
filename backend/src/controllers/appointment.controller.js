import { appointmentService } from '../services/appointmentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { DoctorProfile } from '../models/index.js';
import { ForbiddenError } from '../utils/AppError.js';
import { ERROR_CODES, ROLES } from '../config/constants.js';

/**
 * Patient: Book an appointment slot (Transactional R7.1)
 */
export const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, slotId, bookedForType, bookedForId, reasonForVisit, notes, captchaToken } = req.body;

  const appointment = await appointmentService.bookSlot({
    patientId: req.user.id,
    doctorId,
    slotId,
    bookedForType,
    bookedForId,
    reasonForVisit,
    notes,
    captchaToken,
  });

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: appointment,
  });
});

/**
 * Patient: List my appointments
 */
export const getMyAppointments = asyncHandler(async (req, res) => {
  const { page, limit, status, upcoming } = req.query;

  const result = await appointmentService.getMyAppointments(req.user.id, {
    page,
    limit,
    status,
    upcoming,
  });

  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta,
  });
});

/**
 * Get appointment by ID
 */
export const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const appointment = await appointmentService.getAppointmentById(id, req.user);

  res.status(200).json({
    success: true,
    data: appointment,
  });
});

/**
 * Doctor: List doctor's appointments
 */
export const getDoctorAppointments = asyncHandler(async (req, res) => {
  const { page, limit, status, date, upcoming } = req.query;

  // Find doctorProfile for logged-in doctor
  let doctorProfileId;
  if (req.user.role === ROLES.DOCTOR) {
    const profile = await DoctorProfile.findOne({ userId: req.user.id });
    if (!profile) {
      throw new ForbiddenError('Doctor profile not found for current user', ERROR_CODES.FORBIDDEN);
    }
    doctorProfileId = profile._id;
  } else if (req.user.role === ROLES.ADMIN && req.query.doctorId) {
    doctorProfileId = req.query.doctorId;
  } else {
    throw new ForbiddenError('Doctor profile identifier required', ERROR_CODES.FORBIDDEN);
  }

  const result = await appointmentService.getDoctorAppointments(doctorProfileId, {
    page,
    limit,
    status,
    date,
    upcoming,
  });

  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta,
  });
});

/**
 * Clinic Admin: List appointments for their clinic (Strictly Scoped R6.5)
 */
export const getClinicAppointments = asyncHandler(async (req, res) => {
  const { page, limit, status, date, doctorId } = req.query;

  // Enforce clinicId strictly from authenticated user JWT
  const clinicId = req.user.clinicId;

  const result = await appointmentService.getClinicAppointments(clinicId, {
    page,
    limit,
    status,
    date,
    doctorId,
  });

  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta,
  });
});

/**
 * Doctor / Clinic Admin / Platform Admin: Update appointment status
 */
export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const updatedAppointment = await appointmentService.updateStatus(
    id,
    { status, reason },
    req.user
  );

  res.status(200).json({
    success: true,
    message: `Appointment status updated to ${status}`,
    data: updatedAppointment,
  });
});

/**
 * Patient / Platform Admin: Cancel appointment
 */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const cancelledAppointment = await appointmentService.cancelAppointment(
    id,
    { reason },
    req.user
  );

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: cancelledAppointment,
  });
});

/**
 * Doctor / Clinic Admin / Platform Admin: Emergency Unavailability
 */
export const emergencyUnavailable = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await appointmentService.emergencyUnavailable(id, req.user);

  res.status(200).json({
    success: true,
    message: `Emergency unavailability recorded. ${result.affectedAppointmentsCount} appointment(s) cancelled for today.`,
    data: result,
  });
});

/**
 * Export appointment as .ics calendar file
 */
export const exportAppointmentIcs = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { filename, content } = await appointmentService.generateIcsCalendar(id, req.user);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(content);
});

export default {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  getDoctorAppointments,
  getClinicAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  emergencyUnavailable,
  exportAppointmentIcs,
};
