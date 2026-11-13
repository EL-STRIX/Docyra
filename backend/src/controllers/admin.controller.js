import mongoose from 'mongoose';
import { doctorService } from '../services/doctorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Appointment, Clinic, DoctorProfile, User } from '../models/index.js';
import { APPOINTMENT_STATUS, ROLES } from '../config/constants.js';

export const approveDoctorApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isApproved = req.body.isApproved !== undefined
    ? Boolean(req.body.isApproved)
    : req.body.status === 'approved';
  const reason = req.body.reason || req.body.rejectionReason;

  const result = await doctorService.approveOrRejectDoctor(id, { isApproved, reason });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const listPendingDoctorApplications = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await doctorService.listPendingApplications({ page, limit });

  res.status(200).json({
    success: true,
    data: result.applications,
    meta: result.meta,
  });
});

export const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, clinicId } = req.query;

  const matchFilter = {};
  if (clinicId && mongoose.Types.ObjectId.isValid(clinicId)) {
    matchFilter.clinicId = new mongoose.Types.ObjectId(clinicId);
  }
  if (startDate || endDate) {
    matchFilter.slotStart = {};
    if (startDate) matchFilter.slotStart.$gte = new Date(startDate);
    if (endDate) matchFilter.slotStart.$lte = new Date(endDate);
  }

  const [
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    totalClinics,
    totalDoctors,
    totalPatients,
  ] = await Promise.all([
    Appointment.countDocuments(matchFilter),
    Appointment.countDocuments({ ...matchFilter, status: APPOINTMENT_STATUS.COMPLETED }),
    Appointment.countDocuments({ ...matchFilter, status: APPOINTMENT_STATUS.CANCELLED }),
    Clinic.countDocuments(),
    DoctorProfile.countDocuments({ isApproved: true }),
    User.countDocuments({ role: ROLES.PATIENT }),
  ]);

  // Revenue calculation
  const revenueAgg = await Appointment.aggregate([
    { $match: { ...matchFilter, status: APPOINTMENT_STATUS.COMPLETED } },
    { $group: { _id: null, total: { $sum: '$consultationFee' } } },
  ]);
  const revenueEstimated = revenueAgg[0]?.total || completedAppointments * 500;

  // Monthly Trend
  const monthlyRes = await Appointment.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$slotStart' } },
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUS.COMPLETED] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUS.CANCELLED] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 12 },
  ]);
  const monthlyTrend = monthlyRes.map((m) => ({
    month: m._id,
    count: m.count,
    completed: m.completed,
    cancelled: m.cancelled,
  }));

  // Status breakdown
  const statusRes = await Appointment.aggregate([
    { $match: matchFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const statusBreakdown = {};
  statusRes.forEach((s) => {
    if (s._id) statusBreakdown[s._id] = s.count;
  });

  // Specialization breakdown
  const specRes = await DoctorProfile.aggregate([
    { $match: { isApproved: true } },
    {
      $lookup: {
        from: 'specializations',
        localField: 'specializationId',
        foreignField: '_id',
        as: 'spec',
      },
    },
    { $unwind: '$spec' },
    { $group: { _id: '$spec.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  const specializationBreakdown = specRes.map((s) => ({
    name: s._id,
    count: s.count,
  }));

  // Top Clinics
  const topClinicsRes = await Clinic.find({
    $or: [{ subscriptionStatus: 'active' }, { status: 'active' }],
  })
    .sort({ avgRating: -1 })
    .limit(5)
    .lean();

  const clinicIds = topClinicsRes.map((c) => c._id);
  const clinicAptCounts = await Appointment.aggregate([
    { $match: { clinicId: { $in: clinicIds } } },
    { $group: { _id: '$clinicId', count: { $sum: 1 } } },
  ]);
  const aptCountMap = {};
  clinicAptCounts.forEach((a) => {
    aptCountMap[a._id.toString()] = a.count;
  });

  const topClinics = topClinicsRes.map((c) => ({
    clinicId: c._id.toString(),
    name: c.name,
    city: c.city,
    appointmentsCount: aptCountMap[c._id.toString()] || 0,
    rating: c.avgRating || 5.0,
  }));

  res.status(200).json({
    success: true,
    data: {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalClinics,
      totalDoctors,
      totalPatients,
      revenueEstimated,
      monthlyTrend,
      statusBreakdown,
      specializationBreakdown,
      topClinics,
    },
  });
});

export default {
  approveDoctorApplication,
  listPendingDoctorApplications,
  getPlatformAnalytics,
};
