import { clinicService } from '../services/clinicService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../config/constants.js';

export const listClinics = asyncHandler(async (req, res) => {
  const { page, limit, search, city } = req.query;
  const result = await clinicService.listPublicClinics({ page, limit, search, city });

  res.status(200).json({
    success: true,
    data: result.clinics,
    meta: result.meta,
  });
});

export const getClinicDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await clinicService.getClinicDetail(id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const onboardClinic = asyncHandler(async (req, res) => {
  const { name, address, city, contactEmail, contactPhone, subscriptionStatus, description } = req.body;
  const adminId = req.user._id;

  const clinic = await clinicService.onboardClinic({
    name,
    address,
    city,
    contactEmail,
    contactPhone,
    subscriptionStatus,
    description,
    adminId,
  });

  res.status(201).json({
    success: true,
    data: clinic,
  });
});

export const updateClinic = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Authorization check: Admin can update any clinic; Clinic Admin can only update their own clinic
  if (req.user && req.user.role === ROLES.CLINIC_ADMIN) {
    if (!req.user.clinicId || req.user.clinicId.toString() !== id.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden. You can only update your own clinic.' },
      });
    }
  }

  const payload = { ...req.body };

  // Normalize contact object to top-level fields if provided
  if (payload.contact && typeof payload.contact === 'object') {
    if (payload.contact.phone) payload.contactPhone = payload.contact.phone;
    if (payload.contact.email) payload.contactEmail = payload.contact.email;
    if (payload.contact.website) payload.website = payload.contact.website;
  }

  // Normalize address object to top-level fields if provided
  if (payload.address && typeof payload.address === 'object') {
    if (payload.address.city) payload.city = payload.address.city;
    if (payload.address.state) payload.state = payload.address.state;
    if (payload.address.postalCode) payload.postalCode = payload.address.postalCode;
    if (payload.address.country) payload.country = payload.address.country;
    if (payload.address.street) payload.address = payload.address.street;
  }

  // Clinic Admin cannot update subscription status or onboarding admin
  if (req.user && req.user.role === ROLES.CLINIC_ADMIN) {
    delete payload.subscriptionStatus;
    delete payload.onboardedByAdminId;
  }

  const clinic = await clinicService.updateClinic(id, payload);

  res.status(200).json({
    success: true,
    data: clinic,
  });
});

export const listAllClinicsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const result = await clinicService.listAllClinicsAdmin({ page, limit, status, search });

  res.status(200).json({
    success: true,
    data: result.clinics,
    meta: result.meta,
  });
});

export const getMyClinic = asyncHandler(async (req, res) => {
  const clinicId = req.user?.clinicId;
  if (!clinicId) {
    return res.status(404).json({ success: false, error: { message: 'No clinic associated with this user' } });
  }
  const result = await clinicService.getClinicDetail(clinicId);
  res.status(200).json({
    success: true,
    data: result.clinic,
  });
});

export const getClinicDoctors = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await clinicService.getClinicDetail(id);
  res.status(200).json({
    success: true,
    data: result.doctors,
  });
});

export default {
  listClinics,
  getClinicDetail,
  getMyClinic,
  getClinicDoctors,
  onboardClinic,
  updateClinic,
  listAllClinicsAdmin,
};
