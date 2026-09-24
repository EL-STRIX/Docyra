import { z } from 'zod';

export const joinWaitlistSchema = z.object({
  body: z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    desiredDateRangeStart: z.string().min(1, 'Desired date range start is required'),
    desiredDateRangeEnd: z.string().min(1, 'Desired date range end is required'),
  }),
});

export const claimWaitlistSchema = z.object({
  body: z.object({
    waitlistId: z.string().min(1, 'Waitlist ID is required'),
    slotId: z.string().min(1, 'Slot ID is required'),
    reasonForVisit: z.string().min(2, 'Reason for visit must be at least 2 characters').max(500),
    notes: z.string().max(1000).optional(),
    captchaToken: z.string().optional(),
  }),
});
