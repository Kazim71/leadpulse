import { z } from 'zod';

/**
 * Event types the tracking snippet emits. Mirrors the SaleAssist naming
 * exactly, including its inconsistent casing (snake_case for page-level
 * views, camelCase for interaction events) — normalizing here would break
 * the correspondence with the snippet and with existing seed data.
 *
 * Note the events table has no CHECK constraint on event_type by design
 * (see 0001_init_schema.sql): this enum is the validation boundary, so a
 * new event type ships as a code change and returns a useful 400 instead of
 * a constraint violation.
 */
export const EVENT_TYPES = [
  'page_view',
  'search',
  'category_view',
  'product_view',
  'productClick',
  'productDetail',
  'addToCart',
  'promotionClick',
  'checkout',
  'purchase',
  'refund',
] as const;

export const eventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof eventTypeSchema>;

const productSchema = z
  .object({
    name: z.string().optional(),
    id: z.string().optional(),
    // Kept as string|number rather than coerced: upstream carts send
    // "4999.00" and 4999 interchangeably, and this lands in jsonb where
    // both are valid. Money parsing belongs in the analytics layer.
    price: z.union([z.string(), z.number()]).optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    variant: z.string().optional(),
    quantity: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const promotionSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    creative: z.string().optional(),
    position: z.string().optional(),
  })
  .passthrough();

const actionFieldSchema = z
  .object({
    list: z.string().optional(),
    id: z.string().optional(),
    step: z.union([z.string(), z.number()]).optional(),
    option: z.string().optional(),
  })
  .passthrough();

const viewDataSchema = z
  .object({
    url: z.string().max(2048),
  })
  .passthrough();

/**
 * `.passthrough()` at the root is what makes the metadata catch-all work:
 * unknown top-level keys survive validation and are folded into the
 * metadata jsonb by toEventRow(). The snippet can start sending a new field
 * without a backend deploy.
 */
export const eventPayloadSchema = z
  .object({
    event_type: eventTypeSchema,
    visitor_id: z.string().min(1).max(255),
    view_data: viewDataSchema,
    actionField: actionFieldSchema.optional(),
    products: z.array(productSchema).optional(),
    promotions: z.array(promotionSchema).optional(),
    /** Explicit extra metadata, merged with the catch-all below. */
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type EventPayload = z.infer<typeof eventPayloadSchema>;

/** Top-level keys that map to their own column, or are handled explicitly. */
const RESERVED_KEYS = new Set(['event_type', 'visitor_id', 'metadata']);

export interface EventRow {
  organization_id: string;
  visitor_id: string;
  event_type: EventType;
  url: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Maps a validated payload onto the events table shape.
 *
 * city/state/country/pincode are intentionally absent: location enrichment
 * is phase 6+. Leaving the columns null is honest; a stubbed geo lookup
 * would seed the table with data nobody could later distinguish from real.
 */
export function toEventRow(organizationId: string, payload: EventPayload): EventRow {
  const { event_type, visitor_id, metadata: explicitMetadata, ...rest } = payload;

  const passthrough: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (!RESERVED_KEYS.has(key)) passthrough[key] = value;
  }

  return {
    organization_id: organizationId,
    visitor_id,
    event_type,
    url: payload.view_data.url ?? null,
    // view_data/actionField/products/promotions arrive via passthrough, so
    // the stored document keeps the exact snippet shape. Explicit metadata
    // is spread last and wins on key collision.
    metadata: { ...passthrough, ...(explicitMetadata ?? {}) },
  };
}
