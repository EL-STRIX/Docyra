const clinicService = require('../services/clinicService');
const asyncHandler = require('../utils/asyncHandler');

const listPublicClinics = asyncHandler(async (req, res) => {
  const result = await clinicService.listActiveClinics(req.query);
  res.status(200).json({
    success: true,
    data: result.clinics,
    meta: result.meta
  });
});

const getClinicDetail = asyncHandler(async (req, res) => {
  const result = await clinicService.getClinicDetail(req.params.id);
  res.status(200).json({
    success: true,
    data: result
  });
});

const adminCreateClinic = asyncHandler(async (req, res) => {
  const clinic = await clinicService.createClinic(req.body, req.user._id);
  res.status(201).json({
    success: true,
    data: clinic
  });
});

const adminListClinics = asyncHandler(async (req, res) => {
  const result = await clinicService.listAllClinics(req.query);
  res.status(200).json({
    success: true,
    data: result.clinics,
    meta: result.meta
  });
});

const adminUpdateClinic = asyncHandler(async (req, res) => {
  const clinic = await clinicService.updateClinic(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: clinic
  });
});

const adminDeleteClinic = asyncHandler(async (req, res) => {
  await clinicService.deleteClinic(req.params.id);
  res.status(200).json({
    success: true,
    data: {
      message: 'Clinic suspended successfully'
    }
  });
});

module.exports = {
  listPublicClinics,
  getClinicDetail,
  adminCreateClinic,
  adminListClinics,
  adminUpdateClinic,
  adminDeleteClinic
};
