import type { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';
import { env } from '../config/env.js';
import { TABLES } from '../lib/tables.js';
import { unauthorized } from '../lib/errors.js';
import { logger, serializeError } from '../lib/logger.js';

const API_KEY_HEADER = 'x-api-key';

interface CacheEntry {
  /** null = key is known-invalid. Cached too, see below. */
  organizationId: string | null;
  expiresAt: number;
}

/**
 * In-memory api_key -> organization_id cache.
 *
 * This middleware runs on every ingestion request, so an uncached lookup
 * would mean one Postgres round-trip per tracked event. After the first hit
 * per org, resolution is an O(1) Map read.
 *
 * Negative results are cached too, with the same TTL: without that, a
 * misconfigured or malicious snippet hammering a bad key would bypass the
 * cache entirely and put a query on the database per request — the exact
 * load the cache exists to prevent.
 *
 * Process-local. With more than one instance each keeps its own copy, which
 * is fine (identical, read-only, self-expiring data). Swap for Redis only
 * if key revocation needs to propagate faster than the TTL.
 */
const cache = new Map<string, CacheEntry>();

const ttlMs = env.ORG_CACHE_TTL_SECONDS * 1000;

/** Exposed for tests and for a future admin "revoke key" hook. */
export function invalidateOrgCache(apiKey?: string): void {
  if (apiKey) cache.delete(apiKey);
  else cache.clear();
}

async function lookupOrganizationId(apiKey: string): Promise<string | null> {
  const cached = cache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.organizationId;
  }

  const { data, error } = await supabase
    .from(TABLES.ORGANIZATIONS)
    .select('id')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (error) {
    // Do not cache infrastructure failures as "invalid key" — that would
    // turn a transient blip into 60s of 401s for a legitimate tenant.
    logger.error('organization lookup failed', serializeError(error));
    throw error;
  }

  const organizationId = data?.id ?? null;
  cache.set(apiKey, { organizationId, expiresAt: Date.now() + ttlMs });
  return organizationId;
}

export async function resolveOrg(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.header(API_KEY_HEADER);
    const apiKey = typeof header === 'string' ? header.trim() : '';

    if (!apiKey) {
      next(unauthorized('Missing x-api-key header'));
      return;
    }

    const organizationId = await lookupOrganizationId(apiKey);

    if (!organizationId) {
      // Deliberately identical message to the missing-key case: telling a
      // caller that a key is well-formed but unknown is a probing oracle.
      logger.warn('rejected unknown api key', { api_key_prefix: apiKey.slice(0, 6) });
      next(unauthorized());
      return;
    }

    req.organizationId = organizationId;
    next();
  } catch (err) {
    next(err);
  }
}
