import { z } from 'zod';

export const applyDoctorSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Doctor name is required'),
    email: z.string().trim().email('Invalid email').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().trim().optional(),
    clinicId: z.string().min(1, 'Target clinic selection is required'),
    specializationId: z.string().min(1, 'Specialization is required'),
    qualifications: z.union([z.string(), z.array(z.string())]).optional(),
    bio: z.string().trim().optional(),
    consultationFee: z.coerce.number().min(0).default(500),
    clinicAddress: z.string().trim().optional(),
    yearsExperience: z.coerce.number().min(0).default(0),
  }),
});

export const clinicAdminAddDoctorSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Doctor name is required'),
    email: z.string().trim().email('Invalid email').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().trim().optional(),
    specializationId: z.string().min(1, 'Specialization is required'),
    qualifications: z.union([z.string(), z.array(z.string())]).optional(),
    bio: z.string().trim().optional(),
    consultationFee: z.coerce.number().min(0).default(500),
    yearsExperience: z.coerce.number().min(0).default(0),
  }),
});

export const approveDoctorSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Doctor profile ID is required'),
  }),
  body: z.object({
    isApproved: z.boolean(),
    reason: z.string().trim().optional(),
  }),
});
