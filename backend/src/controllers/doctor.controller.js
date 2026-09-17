const doctorService = require('../services/doctorService');
const asyncHandler = require('../utils/asyncHandler');

const searchDoctors = asyncHandler(async (req, res) => {
  const result = await doctorService.searchDoctors(req.query);
  res.status(200).json({
    success: true,
    data: result.doctors,
    meta: result.meta
  });
});

const getDoctorProfile = asyncHandler(async (req, res) => {
  const profile = await doctorService.getDoctorProfile(req.params.id);
  res.status(200).json({
    success: true,
    data: profile
  });
});

const applyIndependentDoctor = asyncHandler(async (req, res) => {
  const licenseFile = req.file ? {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype
  } : null;

  const result = await doctorService.applyIndependentDoctor(req.body, licenseFile);
  res.status(201).json({
    success: true,
    data: {
      message: 'Independent doctor application submitted successfully. Pending Platform Admin approval.',
      ...result
    }
  });
});

const approveDoctor = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;
  const profile = await doctorService.approveDoctor(req.params.id, isApproved);
  res.status(200).json({
    success: true,
    data: profile
  });
});

const listDoctorApplications = asyncHandler(async (req, res) => {
  const applications = await doctorService.listDoctorApplications();
  res.status(200).json({
    success: true,
    data: applications
  });
});

module.exports = {
  searchDoctors,
  getDoctorProfile,
  applyIndependentDoctor,
  approveDoctor,
  listDoctorApplications
};
