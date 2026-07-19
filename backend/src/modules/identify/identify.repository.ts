import { supabase } from '../../config/supabaseClient.js';
import { RPC } from '../../lib/tables.js';
import { badRequest, conflict, internal } from '../../lib/errors.js';
import { logger, serializeError } from '../../lib/logger.js';
import type { IdentifyPayload } from './identify.schema.js';

export interface IdentifyResult {
  contactId: string;
  linkedEvents: number;
}

interface IdentifyRpcResult {
  contact_id: string;
  linked_events: number;
}

/**
 * All three writes happen inside identify_visitor() (see
 * 0002_identify_fn.sql):
 *   1. upsert the contact, matched by phone or email within the org
 *   2. upsert visitor_identity_map
 *   3. backfill events.contact_id for this visitor
 *
 * They run as one Postgres statement and are therefore atomic. Doing this
 * from Node with supabase-js is not possible: PostREST gives each call its
 * own transaction, so a failure at step 3 would leave a contact with
 * orphaned anonymous events — precisely the state this must prevent.
 *
 * The backfill is one set-based UPDATE inside that function, not a fetch
 * loop, so cost is independent of how many events the visitor accumulated.
 */
export const identifyRepository = {
  async identify(
    organizationId: string,
    payload: IdentifyPayload,
  ): Promise<IdentifyResult> {
    const { data, error } = await supabase.rpc(RPC.IDENTIFY_VISITOR, {
      p_organization_id: organizationId,
      p_visitor_id: payload.visitor_id,
      p_phone: payload.phone ?? null,
      p_email: payload.email ?? null,
      p_name: payload.name ?? null,
      p_city: payload.city ?? null,
      p_state: payload.state ?? null,
      p_country: payload.country ?? null,
      p_pincode: payload.pincode ?? null,
    });

    if (error) {
      logger.error('identify_visitor rpc failed', {
        org_id: organizationId,
        visitor_id: payload.visitor_id,
        pg_code: error.code,
        ...serializeError(error),
      });

      // 23505: the phone or email already belongs to a different contact in
      // this org. That is a merge conflict, not a server fault — see the
      // TODO in 0002_identify_fn.sql.
      if (error.code === '23505') {
        throw conflict(
          'This phone or email is already attached to a different contact',
        );
      }
      // 22023: raised by the function when both phone and email are null.
      // Schema validation catches this first; reaching here means a caller
      // bypassed the service layer.
      if (error.code === '22023') {
        throw badRequest('At least one of phone or email is required');
      }

      throw internal('Failed to identify visitor');
    }

    const result = data as IdentifyRpcResult | null;

    if (!result?.contact_id) {
      logger.error('identify_visitor returned no contact', {
        org_id: organizationId,
        visitor_id: payload.visitor_id,
      });
      throw internal('Failed to identify visitor');
    }

    return {
      contactId: result.contact_id,
      linkedEvents: Number(result.linked_events ?? 0),
    };
  },
};
