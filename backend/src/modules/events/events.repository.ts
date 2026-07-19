import { supabase } from '../../config/supabaseClient.js';
import { TABLES } from '../../lib/tables.js';
import { internal } from '../../lib/errors.js';
import { logger, serializeError } from '../../lib/logger.js';
import type { EventRow } from './events.schema.js';

/**
 * Data access for events. No validation and no business rules here — the
 * row arrives ready to write.
 */
export const eventsRepository = {
  async insert(row: EventRow): Promise<string> {
    const { data, error } = await supabase
      .from(TABLES.EVENTS)
      .insert(row)
      .select('id')
      .single();

    if (error) {
      logger.error('event insert failed', {
        org_id: row.organization_id,
        visitor_id: row.visitor_id,
        ...serializeError(error),
      });
      // The Postgres message may name columns and constraints. Swallow it
      // into a generic 500; the detail is already in the log above.
      throw internal('Failed to record event');
    }

    return data.id as string;
  },
};
