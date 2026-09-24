import { z } from 'zod';

export const consentSchema = z.object({
  body: z.object({
    termsVersion: z.string().trim().min(1, 'Terms version is required'),
  }),
});

export default {
  consentSchema,
};
