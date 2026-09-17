const specializationService = require('../services/specializationService');
const asyncHandler = require('../utils/asyncHandler');

const getAll = asyncHandler(async (req, res) => {
  const data = await specializationService.getAll();
  res.status(200).json({
    success: true,
    data
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await specializationService.getById(req.params.id);
  res.status(200).json({
    success: true,
    data
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await specializationService.create(req.body);
  res.status(201).json({
    success: true,
    data
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await specializationService.update(req.params.id, req.body);
  res.status(200).json({
    success: true,
    data
  });
});

const remove = asyncHandler(async (req, res) => {
  await specializationService.delete(req.params.id);
  res.status(200).json({
    success: true,
    data: {
      message: 'Specialization deleted successfully'
    }
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
