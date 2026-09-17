const doctorService = require('../services/doctorService');
const asyncHandler = require('../utils/asyncHandler');

const addDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.addClinicDoctor(req.user, req.body);
  res.status(201).json({
    success: true,
    data: {
      message: 'Doctor added successfully to your clinic (auto-approved).',
      ...result
    }
  });
});

const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorService.listClinicDoctors(req.user.clinicId);
  res.status(200).json({
    success: true,
    data: doctors
  });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const profile = await doctorService.updateClinicDoctor(req.user.clinicId, req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: profile
  });
});

module.exports = {
  addDoctor,
  getDoctors,
  updateDoctor
};
