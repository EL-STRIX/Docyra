import { z } from 'zod';
import { CLINIC_SUBSCRIPTION_STATUS } from '../config/constants.js';

export const onboardClinicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Clinic name must be at least 2 characters').max(150),
    address: z.union([z.string().trim().min(2, 'Address is required'), z.record(z.any())]),
    city: z.string().trim().min(2, 'City is required').optional(),
    state: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
    contact: z.record(z.any()).optional(),
    contactEmail: z.string().trim().email('Invalid contact email address').toLowerCase().optional(),
    contactPhone: z.string().trim().min(7, 'Contact phone is required').optional(),
    website: z.string().trim().optional(),
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
    address: z.union([z.string().trim().min(2), z.record(z.any())]).optional(),
    city: z.string().trim().min(2).optional(),
    state: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    country: z.string().trim().optional(),
    website: z.string().trim().optional(),
    contact: z.record(z.any()).optional(),
    contactEmail: z.string().trim().email().toLowerCase().optional(),
    contactPhone: z.string().trim().min(7).optional(),
    subscriptionStatus: z.enum(Object.values(CLINIC_SUBSCRIPTION_STATUS)).optional(),
    status: z.enum(['active', 'suspended', 'trial']).optional(),
    description: z.string().trim().optional(),
  }),
});
