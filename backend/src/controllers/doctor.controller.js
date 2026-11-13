import multer from 'multer';
import { doctorService } from '../services/doctorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

export const uploadMiddleware = upload.single('licenseFile');

export const searchDoctors = asyncHandler(async (req, res) => {
  const { page, limit, search, specializationId, specialization, clinicId, isIndependent, minRating } = req.query;
  const result = await doctorService.searchDoctors({
    page,
    limit,
    search,
    specializationId: specializationId || specialization,
    clinicId,
    isIndependent,
    minRating,
  });

  res.status(200).json({
    success: true,
    data: result.doctors,
    meta: result.meta,
  });
});

export const getDoctorProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doctor = await doctorService.getDoctorProfile(id);

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

export const applyIndependentDoctor = asyncHandler(async (req, res) => {
  const licenseFile = req.file;
  const result = await doctorService.applyIndependentDoctor(req.body, licenseFile);

  res.status(201).json({
    success: true,
    data: result,
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
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

export const updateDoctorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const doctor = await doctorService.updateDoctorProfile(
    id,
    { status },
    req.user.role,
    req.user.clinicId
  );

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

export default {
  uploadMiddleware,
  searchDoctors,
  getDoctorProfile,
  applyIndependentDoctor,
  updateProfile,
  updateDoctorStatus,
};
