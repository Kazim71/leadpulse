import { z } from 'zod';

/**
 * Mirrors the contacts_phone_or_email CHECK constraint from
 * 0001_init_schema.sql. Enforcing it here too is deliberate duplication:
 * the API returns a 400 explaining what is missing, rather than surfacing a
 * constraint violation as a 500.
 */
export const identifyPayloadSchema = z
  .object({
    visitor_id: z.string().min(1).max(255),
    phone: z.string().min(1).max(32).optional(),
    email: z.string().email().max(255).optional(),
    name: z.string().max(255).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    country: z.string().max(120).optional(),
    pincode: z.string().max(32).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.phone || data.email), {
    message: 'At least one of phone or email is required',
    path: ['phone'],
  });

export type IdentifyPayload = z.infer<typeof identifyPayloadSchema>;

/**
 * `.strict()` rather than `.passthrough()` — the opposite of the events
 * schema. Events are an open document that lands in jsonb; identify writes
 * to typed columns, so an unrecognized key is far more likely to be a
 * client-side typo silently dropping data than a new feature. Failing loud
 * is the safer default here.
 */
