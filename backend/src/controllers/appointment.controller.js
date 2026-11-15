import { appointmentService } from '../services/appointmentService.js';
import { storageService } from '../services/storageService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { DoctorProfile, Appointment } from '../models/index.js';
import { ForbiddenError, NotFoundError } from '../utils/AppError.js';
import { ERROR_CODES, ROLES } from '../config/constants.js';

/**
 * Patient: Book an appointment slot (Transactional R7.1)
 */
export const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, slotId, bookedForType, bookedForId, reasonForVisit, notes, captchaToken, previousAppointmentId } = req.body;

  const appointment = await appointmentService.bookSlot({
    patientId: req.user.id,
    doctorId,
    slotId,
    bookedForType,
    bookedForId,
    reasonForVisit,
    notes,
    captchaToken,
    previousAppointmentId,
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
  const { page, limit, status, date, upcoming, patientId, sortBy, sortOrder } = req.query;

  // Find doctorProfile for logged-in doctor
  let doctorProfileId;
  if (req.user.role === ROLES.DOCTOR) {
    const profile = await DoctorProfile.findOne({ userId: req.user._id || req.user.id });
    if (!profile) {
      throw new ForbiddenError('Doctor profile not found for current user', ERROR_CODES.FORBIDDEN);
    }
    doctorProfileId = profile._id;
  } else if ((req.user.role === ROLES.ADMIN || req.user.role === ROLES.CLINIC_ADMIN) && req.query.doctorId) {
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
    patientId,
    sortBy,
    sortOrder,
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
  let { status, reason, notes, prescription, medicalTests } = req.body;

  if (status === 'no_show') {
    status = 'no-show';
  }

  const updatedAppointment = await appointmentService.updateStatus(
    id,
    { status, reason, notes, prescription, medicalTests },
    req.user
  );

  res.status(200).json({
    success: true,
    message: status ? `Appointment status updated to ${status}` : 'Appointment updated successfully',
    data: updatedAppointment,
  });
});

/**
 * Patient / Platform Admin: Cancel appointment
 */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, confirmLate, emergency } = req.body;

  const cancelledAppointment = await appointmentService.cancelAppointment(
    id,
    { reason, confirmLate, emergency },
    req.user
  );

  res.status(200).json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: cancelledAppointment,
  });
});

/**
 * Patient: Reschedule appointment slot in place (without creating duplicate appointments)
 */
export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slotId } = req.body;

  const rescheduled = await appointmentService.rescheduleAppointment(
    id,
    { slotId },
    req.user
  );

  res.status(200).json({
    success: true,
    message: 'Appointment rescheduled successfully',
    data: rescheduled,
  });
});

/**
 * Doctor / Clinic Admin / Platform Admin: Emergency Unavailability
 */
export const emergencyUnavailable = asyncHandler(async (req, res) => {
  let { id } = req.params;
  if (id === 'me') {
    const profile = await DoctorProfile.findOne({ userId: req.user._id || req.user.id });
    if (!profile) {
      throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
    }
    id = profile._id.toString();
  }

  const result = await appointmentService.emergencyUnavailable(id, req.user, req.body);

  res.status(200).json({
    success: true,
    message: `Emergency unavailability recorded. ${result.affectedAppointmentsCount} appointment(s) cancelled.`,
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

/**
 * Doctor / Clinic Admin: Record medical test and optionally upload lab report file
 */
export const uploadTestResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const testId = req.params.testId || req.body.testId;
  const { testName, instructions, resultNotes, status } = req.body;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
  }

  // Clinic Admin clinic ownership check
  if (req.user.role === ROLES.CLINIC_ADMIN && req.user.clinicId) {
    if (appointment.clinicId && appointment.clinicId.toString() !== req.user.clinicId.toString()) {
      throw new ForbiddenError('Access denied: You cannot modify tests for another clinic', ERROR_CODES.FORBIDDEN);
    }
  }

  let fileUrl = null;
  if (req.file) {
    fileUrl = await storageService.uploadFile(req.file, 'test-results');
  }

  if (!appointment.medicalTests) {
    appointment.medicalTests = [];
  }

  let targetTest = null;
  if (testId) {
    targetTest = appointment.medicalTests.id(testId) || appointment.medicalTests.find(t => t._id?.toString() === testId);
  } else if (testName) {
    targetTest = appointment.medicalTests.find(t => t.testName?.trim().toLowerCase() === testName.trim().toLowerCase());
  }

  if (targetTest) {
    if (fileUrl) targetTest.resultFileUrl = fileUrl;
    if (resultNotes !== undefined) targetTest.resultNotes = resultNotes;
    if (instructions !== undefined) targetTest.instructions = instructions;
    targetTest.status = status || (fileUrl || resultNotes ? 'completed' : targetTest.status || 'not_started');
    if (targetTest.status === 'completed') {
      targetTest.completedAt = targetTest.completedAt || new Date();
    }
  } else {
    const finalStatus = status || (fileUrl || resultNotes ? 'completed' : 'not_started');
    const newTest = {
      testName: testName || 'Diagnostic Lab Test',
      instructions: instructions || '',
      resultNotes: resultNotes || '',
      resultFileUrl: fileUrl,
      status: finalStatus,
      orderedAt: new Date(),
      completedAt: finalStatus === 'completed' ? new Date() : null,
    };
    appointment.medicalTests.push(newTest);
  }

  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Medical test and report recorded successfully',
    data: appointment,
  });
});

/**
 * Doctor / Clinic Admin: Update a specific medical test's status and clinical result notes
 */
export const updateMedicalTest = asyncHandler(async (req, res) => {
  const { id, testId } = req.params;
  const { status, resultNotes, instructions, resultFileUrl } = req.body;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', ERROR_CODES.NOT_FOUND);
  }

  // Clinic Admin clinic ownership check
  if (req.user.role === ROLES.CLINIC_ADMIN && req.user.clinicId) {
    if (appointment.clinicId && appointment.clinicId.toString() !== req.user.clinicId.toString()) {
      throw new ForbiddenError('Access denied: You cannot modify tests for another clinic', ERROR_CODES.FORBIDDEN);
    }
  }

  if (!appointment.medicalTests) {
    appointment.medicalTests = [];
  }

  const targetTest = appointment.medicalTests.id(testId) || appointment.medicalTests.find(t => t._id?.toString() === testId);
  if (!targetTest) {
    throw new NotFoundError('Medical test not found for this appointment', ERROR_CODES.NOT_FOUND);
  }

  if (status !== undefined) {
    targetTest.status = status;
    if (status === 'completed') {
      targetTest.completedAt = targetTest.completedAt || new Date();
    } else {
      targetTest.completedAt = null;
    }
  }

  if (resultNotes !== undefined) {
    targetTest.resultNotes = resultNotes;
  }

  if (instructions !== undefined) {
    targetTest.instructions = instructions;
  }

  if (resultFileUrl !== undefined) {
    targetTest.resultFileUrl = resultFileUrl;
  }

  await appointment.save();

  res.status(200).json({
    success: true,
    message: 'Medical test updated successfully',
    data: appointment,
  });
});

export default {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  getDoctorAppointments,
  getClinicAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  rescheduleAppointment,
  emergencyUnavailable,
  exportAppointmentIcs,
  uploadTestResult,
  updateMedicalTest,
};
