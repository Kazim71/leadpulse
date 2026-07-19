import { badRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { eventsRepository } from './events.repository.js';
import { eventPayloadSchema, toEventRow } from './events.schema.js';

export interface IngestResult {
  eventId: string;
}

export const eventsService = {
  /**
   * validate -> map -> insert.
   *
   * TODO(idempotency): a network retry from the snippet writes the event
   * twice. Accepted for the MVP — duplicate page_views skew counts but do
   * not corrupt identity resolution. When it matters, have the snippet send
   * a client-generated event_id and add a unique index on
   * (organization_id, event_id) with an ON CONFLICT DO NOTHING insert.
   */
  async ingest(organizationId: string, rawPayload: unknown): Promise<IngestResult> {
    const parsed = eventPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      throw badRequest(
        'Event payload failed validation',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const row = toEventRow(organizationId, parsed.data);
    const eventId = await eventsRepository.insert(row);

    logger.info('event ingested', {
      org_id: organizationId,
      visitor_id: row.visitor_id,
      event_type: row.event_type,
      event_id: eventId,
    });

    return { eventId };
  },
};
