import { z } from 'zod';
import { ROLES } from '../config/constants.js';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    phone: z.string().trim().optional(),
    role: z.enum([ROLES.PATIENT, ROLES.DOCTOR]).default(ROLES.PATIENT),
    acceptedTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms of service and privacy policy',
    }),
    termsVersion: z.string().default('1.0'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Invalid email address').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const twoFactorVerifySchema = z.object({
  body: z.object({
    code: z.string().trim().length(6, '2FA code must be exactly 6 digits'),
    secret: z.string().trim().min(1, 'Secret is required').optional(),
  }),
});

export const twoFactorLoginSchema = z.object({
  body: z.object({
    tempToken: z.string().trim().min(1, 'Temporary token is required'),
    code: z.string().trim().length(6, '2FA code must be exactly 6 digits'),
  }),
});

export const twoFactorDisableSchema = z.object({
  body: z.object({
    code: z.string().trim().length(6, '2FA code must be exactly 6 digits'),
  }),
});

