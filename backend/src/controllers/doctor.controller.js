import multer from 'multer';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { doctorService } from '../services/doctorService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UnauthorizedError, NotFoundError } from '../utils/AppError.js';
import { ERROR_CODES } from '../config/constants.js';

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

export const uploadMiddleware = (req, res, next) => {
  upload.fields([
    { name: 'licenseFile', maxCount: 1 },
    { name: 'licenseDocument', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files['licenseFile']?.[0] || req.files['licenseDocument']?.[0];
    }
    next();
  });
};

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

export const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const doctor = await doctorService.getDoctorProfileByUserId(userId);

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

export const getDoctorProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === 'me') {
    if (!req.user) {
      throw new UnauthorizedError('Authentication token required', ERROR_CODES.UNAUTHORIZED);
    }
    const doctor = await doctorService.getDoctorProfileByUserId(req.user._id || req.user.id);
    return res.status(200).json({
      success: true,
      data: doctor,
    });
  }
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
  let id = req.params.id;
  if (id === 'me') {
    const profile = await DoctorProfile.findOne({ userId: req.user._id || req.user.id });
    if (!profile) {
      throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
    }
    id = profile._id;
  }
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

export const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const profile = await DoctorProfile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('Doctor profile not found for current user', ERROR_CODES.DOCTOR_NOT_FOUND);
  }
  const doctor = await doctorService.updateDoctorProfile(
    profile._id,
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
  getMyDoctorProfile,
  applyIndependentDoctor,
  updateProfile,
  updateMyProfile,
  updateDoctorStatus,
};
