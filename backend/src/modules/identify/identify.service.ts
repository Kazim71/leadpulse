import { badRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { identifyRepository, type IdentifyResult } from './identify.repository.js';
import { identifyPayloadSchema } from './identify.schema.js';

export const identifyService = {
  /**
   * Links an anonymous visitor to a real contact.
   *
   * The three writes are atomic — see identify.repository.ts for why they
   * live in a Postgres function rather than being sequenced here.
   */
  async identify(organizationId: string, rawPayload: unknown): Promise<IdentifyResult> {
    const parsed = identifyPayloadSchema.safeParse(rawPayload);

    if (!parsed.success) {
      throw badRequest(
        'Identify payload failed validation',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const result = await identifyRepository.identify(organizationId, parsed.data);

    logger.info('visitor identified', {
      org_id: organizationId,
      visitor_id: parsed.data.visitor_id,
      contact_id: result.contactId,
      linked_events: result.linkedEvents,
    });

    return result;
  },
};
