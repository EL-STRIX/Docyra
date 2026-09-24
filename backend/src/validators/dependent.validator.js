import { z } from 'zod';

export const createDependentSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    relationship: z.string().min(2, 'Relationship is required (e.g. child, spouse, parent)').max(50),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).default('prefer_not_to_say'),
  }),
});

export const updateDependentSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    relationship: z.string().min(2).max(50).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  }),
});
