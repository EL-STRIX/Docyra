const appointmentService = require('../services/appointmentService');
const asyncHandler = require('../utils/asyncHandler');

const bookAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.bookSlot({
    patientId: req.user._id,
    ...req.body
  });

  res.status(201).json({
    success: true,
    data: {
      message: 'Appointment booked successfully!',
      appointment
    }
  });
});

const getMyPatientAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getPatientAppointments(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta
  });
});

const getDoctorAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getDoctorAppointments(req.user._id, req.query);
  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta
  });
});

const getClinicAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.getClinicAppointments(req.user.clinicId, req.query);
  res.status(200).json({
    success: true,
    data: result.appointments,
    meta: result.meta
  });
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.getAppointmentById(req.params.id, req.user);
  res.status(200).json({
    success: true,
    data: appointment
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.updateStatus(req.user, req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    data: appointment
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(
    req.user,
    req.params.id,
    req.body.cancellationReason
  );
  res.status(200).json({
    success: true,
    data: {
      message: 'Appointment cancelled successfully',
      appointment
    }
  });
});

const doctorEmergencyUnavailable = asyncHandler(async (req, res) => {
  const affected = await appointmentService.emergencyUnavailable(req.params.id);
  res.status(200).json({
    success: true,
    data: {
      message: `Emergency unavailability recorded. ${affected.length} today's confirmed appointments were automatically cancelled and patients notified.`,
      cancelledCount: affected.length,
      appointments: affected
    }
  });
});

const exportIcs = asyncHandler(async (req, res) => {
  const icsData = await appointmentService.generateIcs(req.params.id, req.user);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="appointment-${req.params.id}.ics"`);
  res.send(icsData);
});

module.exports = {
  bookAppointment,
  getMyPatientAppointments,
  getDoctorAppointments,
  getClinicAppointments,
  getAppointmentById,
  updateStatus,
  cancelAppointment,
  doctorEmergencyUnavailable,
  exportIcs
};
