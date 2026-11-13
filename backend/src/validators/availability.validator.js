import { z } from 'zod';

export const availabilityRuleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid startTime format (HH:mm)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid endTime format (HH:mm)'),
  slotDurationMinutes: z.number().int().min(10).max(120).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  const [startH, startM] = data.startTime.split(':').map(Number);
  const [endH, endM] = data.endTime.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  return endTotal > startTotal;
}, {
  message: 'endTime must be after startTime',
  path: ['endTime'],
});

export const weeklyScheduleSlotSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid start time format (HH:mm)'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid end time format (HH:mm)'),
});

export const dayScheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isActive: z.boolean(),
  slots: z.array(weeklyScheduleSlotSchema).optional(),
});

export const setAvailabilitySchema = z.object({
  body: z.object({
    rules: z.array(availabilityRuleItemSchema).optional(),
    weeklySchedule: z.array(dayScheduleItemSchema).optional(),
    slotDurationMinutes: z.number().int().min(10).max(120).optional(),
  }).refine(
    (data) => (Array.isArray(data.rules) && data.rules.length > 0) || (Array.isArray(data.weeklySchedule) && data.weeklySchedule.length > 0),
    {
      message: 'At least one availability rule or weekly schedule configuration is required',
    }
  ),
});

export const getDoctorSlotsSchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    timezone: z.string().optional(),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    defaultSlotDurationMinutes: z.number().int().min(10).max(120).optional(),
    slotDurationDefaultMinutes: z.number().int().min(10).max(120).optional(),
    cancellationWindowHours: z.number().int().min(1).max(168).optional(),
    defaultCurrency: z.string().optional(),
    currency: z.string().optional(),
    maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
    allowIndependentDoctors: z.boolean().optional(),
    twoFactorEnforcedForStaff: z.boolean().optional(),
    autoApproveReviews: z.boolean().optional(),
    maintenanceMode: z.boolean().optional(),
  }),
});
