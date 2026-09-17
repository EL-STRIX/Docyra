const availabilityService = require('../services/availabilityService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { ROLES, ERROR_CODES } = require('../config/constants');
const { DoctorProfile } = require('../models');

const getAvailability = asyncHandler(async (req, res) => {
  const rules = await availabilityService.getDoctorAvailability(req.params.id);
  res.status(200).json({
    success: true,
    data: rules
  });
});

const setAvailability = asyncHandler(async (req, res) => {
  const doctorId = req.params.id;

  // Authorization check: Doctor themselves, Clinic Admin of that doctor, or Platform Admin
  if (req.user.role === ROLES.DOCTOR) {
    if (req.user._id.toString() !== doctorId) {
      throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'Doctors can only manage their own availability');
    }
  } else if (req.user.role === ROLES.CLINIC_ADMIN) {
    const docProfile = await DoctorProfile.findOne({ userId: doctorId, clinicId: req.user.clinicId });
    if (!docProfile) {
      throw AppError.forbidden(ERROR_CODES.CLINIC_ACCESS_DENIED, 'Doctor not affiliated with your clinic');
    }
  } else if (req.user.role !== ROLES.ADMIN) {
    throw AppError.forbidden(ERROR_CODES.FORBIDDEN, 'Insufficient permissions to update doctor availability');
  }

  const rules = await availabilityService.setDoctorAvailability(doctorId, req.body.rules || req.body);
  res.status(200).json({
    success: true,
    data: {
      message: 'Availability rules updated and appointment slots refreshed for the next 60 days.',
      rules
    }
  });
});

const getSlots = asyncHandler(async (req, res) => {
  const slots = await availabilityService.getAvailableSlots(req.params.id, req.query.date);
  res.status(200).json({
    success: true,
    data: slots
  });
});

module.exports = {
  getAvailability,
  setAvailability,
  getSlots
};
