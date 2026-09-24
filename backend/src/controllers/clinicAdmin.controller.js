import { doctorService } from '../services/doctorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const addDoctorToClinic = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
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

export default {
  addDoctorToClinic,
  listClinicDoctors,
  updateClinicDoctor,
};
