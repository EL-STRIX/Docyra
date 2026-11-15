import { doctorService } from '../services/doctorService.js';
import { clinicService } from '../services/clinicService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Clinic } from '../models/index.js';
import { ROLES } from '../config/constants.js';

export const addDoctorToClinic = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId || req.params.id;
  const result = await doctorService.clinicAdminAddDoctor({
    ...req.body,
    clinicId,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
});

export const listClinicDoctors = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const { page, limit, search } = req.query;

  const result = await doctorService.clinicAdminListDoctors({
    clinicId,
    page,
    limit,
    search,
  });

  res.status(200).json({
    success: true,
    data: result.doctors,
    meta: result.meta,
  });
});

export const updateClinicDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctor = await doctorService.updateDoctorProfile(
    id,
    req.body,
    req.user.role,
    req.user.clinicId
  );

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

export const listClinicDoctorApplications = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const { page, limit, status } = req.query;

  const result = await doctorService.listClinicDoctorApplications({
    clinicId,
    page,
    limit,
    status,
  });

  res.status(200).json({
    success: true,
    data: result.applications,
    meta: result.meta,
  });
});

export const reviewClinicDoctorApplication = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const { id } = req.params;
  const { isApproved, reason } = req.body;

  const result = await doctorService.reviewClinicDoctorApplication(id, clinicId, {
    isApproved,
    reason,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const scheduleDoctorApplicationMeeting = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const { id } = req.params;
  const { meetingDate, meetingTime, meetingLink, agenda, customNotes, sendEmail } = req.body;

  const result = await doctorService.scheduleClinicDoctorMeeting(id, clinicId, {
    meetingDate,
    meetingTime,
    meetingLink,
    agenda,
    customNotes,
    sendEmail: sendEmail === true,
    scheduledBy: req.user._id || req.user.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getClinicRevenue = asyncHandler(async (req, res) => {
  let clinicId = req.user.clinicId || req.query.clinicId;

  if (!clinicId && req.user.role === ROLES.ADMIN) {
    const firstClinic = await Clinic.findOne().sort({ createdAt: 1 }).select('_id');
    clinicId = firstClinic?._id;
  }

  const { period, startDate, endDate, year, doctorId } = req.query;

  const result = await clinicService.getClinicRevenueAnalytics({
    clinicId,
    period,
    startDate,
    endDate,
    year,
    doctorId,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export default {
  addDoctorToClinic,
  listClinicDoctors,
  updateClinicDoctor,
  listClinicDoctorApplications,
  reviewClinicDoctorApplication,
  scheduleDoctorApplicationMeeting,
  getClinicRevenue,
};
