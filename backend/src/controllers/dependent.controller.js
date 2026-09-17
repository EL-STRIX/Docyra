const dependentService = require('../services/dependentService');
const asyncHandler = require('../utils/asyncHandler');

const addDependent = asyncHandler(async (req, res) => {
  const dependent = await dependentService.addDependent(req.user._id, req.body);
  res.status(201).json({
    success: true,
    data: dependent
  });
});

const getDependents = asyncHandler(async (req, res) => {
  const dependents = await dependentService.getPatientDependents(req.user._id);
  res.status(200).json({
    success: true,
    data: dependents
  });
});

const deleteDependent = asyncHandler(async (req, res) => {
  await dependentService.deleteDependent(req.user._id, req.params.id);
  res.status(200).json({
    success: true,
    data: {
      message: 'Dependent removed successfully'
    }
  });
});

module.exports = {
  addDependent,
  getDependents,
  deleteDependent
};
