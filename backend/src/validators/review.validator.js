import { z } from 'zod';

export const submitReviewSchema = z.object({
  body: z.object({
    appointmentId: z.string().min(1, 'Appointment ID is required'),
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    comment: z.string().min(3, 'Review comment must be at least 3 characters').max(1000, 'Comment cannot exceed 1000 characters'),
  }),
});

export const updateReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().min(3).max(1000).optional(),
  }),
});
