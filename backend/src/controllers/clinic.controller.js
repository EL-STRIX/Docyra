import { clinicService } from '../services/clinicService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listClinics = asyncHandler(async (req, res) => {
  const { page, limit, search, city } = req.query;
  const result = await clinicService.listPublicClinics({ page, limit, search, city });

  res.status(200).json({
    success: true,
    data: result.clinics,
    meta: result.meta,
  });
});

export const getClinicDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await clinicService.getClinicDetail(id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const onboardClinic = asyncHandler(async (req, res) => {
  const { name, address, city, contactEmail, contactPhone, subscriptionStatus, description } = req.body;
  const adminId = req.user._id;

  const clinic = await clinicService.onboardClinic({
    name,
    address,
    city,
    contactEmail,
    contactPhone,
    subscriptionStatus,
    description,
    adminId,
  });

  res.status(201).json({
    success: true,
    data: clinic,
  });
});

export const updateClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinic = await clinicService.updateClinic(id, req.body);

  res.status(200).json({
    success: true,
    data: clinic,
  });
});

export const listAllClinicsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const result = await clinicService.listAllClinicsAdmin({ page, limit, status, search });

  res.status(200).json({
    success: true,
    data: result.clinics,
    meta: result.meta,
  });
});

export const getMyClinic = asyncHandler(async (req, res) => {
  const clinicId = req.user?.clinicId;
  if (!clinicId) {
    return res.status(404).json({ success: false, error: { message: 'No clinic associated with this user' } });
  }
  const result = await clinicService.getClinicDetail(clinicId);
  res.status(200).json({
    success: true,
    data: result.clinic,
  });
});

export const getClinicDoctors = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await clinicService.getClinicDetail(id);
  res.status(200).json({
    success: true,
    data: result.doctors,
  });
});

export default {
  listClinics,
  getClinicDetail,
  getMyClinic,
  getClinicDoctors,
  onboardClinic,
  updateClinic,
  listAllClinicsAdmin,
};
