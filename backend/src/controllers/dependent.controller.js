import { dependentService } from '../services/dependentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Patient: Add a family dependent
 */
export const createDependent = asyncHandler(async (req, res) => {
  const dependent = await dependentService.createDependent(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Dependent family member added successfully',
    data: dependent,
  });
});

/**
 * Patient: List my dependents
 */
export const listDependents = asyncHandler(async (req, res) => {
  const dependents = await dependentService.listDependents(req.user.id);

  res.status(200).json({
    success: true,
    data: dependents,
  });
});

/**
 * Patient: Get single dependent
 */
export const getDependent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dependent = await dependentService.getDependent(req.user.id, id);

  res.status(200).json({
    success: true,
    data: dependent,
  });
});

/**
 * Patient: Update dependent
 */
export const updateDependent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updatedDependent = await dependentService.updateDependent(req.user.id, id, req.body);

  res.status(200).json({
    success: true,
    message: 'Dependent updated successfully',
    data: updatedDependent,
  });
});

/**
 * Patient: Delete dependent
 */
export const deleteDependent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await dependentService.deleteDependent(req.user.id, id);

  res.status(200).json({
    success: true,
    message: 'Dependent deleted successfully',
  });
});

export default {
  createDependent,
  listDependents,
  getDependent,
  updateDependent,
  deleteDependent,
};
