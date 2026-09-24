import { doctorService } from '../services/doctorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const approveDoctorApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApproved, reason } = req.body;

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

export default {
  approveDoctorApplication,
  listPendingDoctorApplications,
};
