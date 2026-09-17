const waitlistService = require('../services/waitlistService');
const asyncHandler = require('../utils/asyncHandler');

const joinWaitlist = asyncHandler(async (req, res) => {
  const entry = await waitlistService.joinWaitlist({
    patientId: req.user._id,
    ...req.body
  });

  res.status(201).json({
    success: true,
    data: entry
  });
});

const getMyWaitlist = asyncHandler(async (req, res) => {
  const list = await waitlistService.getPatientWaitlist(req.user._id);
  res.status(200).json({
    success: true,
    data: list
  });
});

const leaveWaitlist = asyncHandler(async (req, res) => {
  await waitlistService.leaveWaitlist(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Removed from waitlist successfully'
  });
});

module.exports = {
  joinWaitlist,
  getMyWaitlist,
  leaveWaitlist
};
