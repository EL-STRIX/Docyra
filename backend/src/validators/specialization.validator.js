import { z } from 'zod';

export const createSpecializationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name is required').max(100),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    iconName: z.string().trim().default('Stethoscope'),
  }),
});

export const updateSpecializationSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    slug: z.string().trim().optional(),
    description: z.string().trim().optional(),
    iconName: z.string().trim().optional(),
  }),
});
