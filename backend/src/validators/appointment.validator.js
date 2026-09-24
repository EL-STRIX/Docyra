import { z } from 'zod';
import { APPOINTMENT_STATUS, BOOKED_FOR_TYPE } from '../config/constants.js';

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().min(1, 'Doctor ID is required'),
    slotId: z.string().min(1, 'Slot ID is required'),
    bookedForType: z.enum([BOOKED_FOR_TYPE.SELF, BOOKED_FOR_TYPE.DEPENDENT]).default(BOOKED_FOR_TYPE.SELF),
    bookedForId: z.string().optional().nullable(),
    reasonForVisit: z.string().min(2, 'Reason for visit must be at least 2 characters').max(500),
    notes: z.string().max(1000).optional(),
    captchaToken: z.string().optional(),
  }),
});

export const updateAppointmentStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.CANCELLED,
      APPOINTMENT_STATUS.NO_SHOW,
    ]),
    reason: z.string().max(500).optional(),
  }),
});

export const cancelAppointmentSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});
