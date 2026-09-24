import { z } from 'zod';
import { CLINIC_SUBSCRIPTION_STATUS } from '../config/constants.js';

export const onboardClinicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Clinic name must be at least 2 characters').max(150),
    address: z.string().trim().min(5, 'Address is required'),
    city: z.string().trim().min(2, 'City is required'),
    contactEmail: z.string().trim().email('Invalid contact email address').toLowerCase(),
    contactPhone: z.string().trim().min(7, 'Contact phone is required'),
    subscriptionStatus: z.enum(Object.values(CLINIC_SUBSCRIPTION_STATUS)).default(CLINIC_SUBSCRIPTION_STATUS.ACTIVE),
    description: z.string().trim().optional(),
  }),
});

export const updateClinicSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Clinic ID is required'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(150).optional(),
    address: z.string().trim().min(5).optional(),
    city: z.string().trim().min(2).optional(),
    contactEmail: z.string().trim().email().toLowerCase().optional(),
    contactPhone: z.string().trim().min(7).optional(),
    subscriptionStatus: z.enum(Object.values(CLINIC_SUBSCRIPTION_STATUS)).optional(),
    description: z.string().trim().optional(),
  }),
});
