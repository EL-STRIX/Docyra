import { specializationService } from '../services/specializationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listSpecializations = asyncHandler(async (req, res) => {
  const specializations = await specializationService.listAll();
  res.status(200).json({
    success: true,
    data: specializations,
  });
});

export const getSpecialization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const specialization = await specializationService.getById(id);
  res.status(200).json({
    success: true,
    data: specialization,
  });
});

export const createSpecialization = asyncHandler(async (req, res) => {
  const { name, description, iconName } = req.body;
  const spec = await specializationService.create({ name, description, iconName });
  res.status(201).json({
    success: true,
    data: spec,
  });
});

export const updateSpecialization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, iconName } = req.body;
  const spec = await specializationService.update(id, { name, description, iconName });
  res.status(200).json({
    success: true,
    data: spec,
  });
});

export const deleteSpecialization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await specializationService.delete(id);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export default {
  listSpecializations,
  getSpecialization,
  createSpecialization,
  updateSpecialization,
  deleteSpecialization,
};
