import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { tooManyRequests } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Sliding-window limiter keyed on organization_id + visitor_id.
 *
 * Purpose is debounce, not security: a buggy snippet re-firing the same
 * event in a loop should not write thousands of rows. Abuse prevention is a
 * separate concern (edge/WAF), so the limits here are deliberately loose.
 *
 * IN-MEMORY, PROCESS-LOCAL. Two consequences to be aware of before scaling
 * horizontally:
 *   - N instances means the effective limit is N x RATE_LIMIT_MAX, since
 *     each keeps its own counter.
 *   - Counters reset on deploy.
 * Swap this store for Redis (sorted set per key, ZREMRANGEBYSCORE to prune)
 * when running more than one instance. The middleware signature does not
 * need to change.
 */

const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
const maxHits = env.RATE_LIMIT_MAX;

/** key -> ascending list of hit timestamps inside the current window */
const hits = new Map<string, number[]>();

function keyFor(organizationId: string, visitorId: string): string {
  return `${organizationId}:${visitorId}`;
}

/**
 * Drops timestamps that have aged out, then records the new hit.
 * Returns null when allowed, or seconds-until-retry when limited.
 */
function consume(key: string, now: number): number | null {
  const cutoff = now - windowMs;
  const timestamps = hits.get(key) ?? [];

  // Timestamps are appended in order, so everything expired is a prefix —
  // find the first survivor and slice once instead of filtering per element.
  let firstLive = 0;
  while (firstLive < timestamps.length && timestamps[firstLive]! <= cutoff) {
    firstLive++;
  }
  const live = firstLive > 0 ? timestamps.slice(firstLive) : timestamps;

  if (live.length >= maxHits) {
    hits.set(key, live);
    const oldest = live[0]!;
    return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  }

  live.push(now);
  hits.set(key, live);
  return null;
}

/**
 * Without this, `hits` grows once per distinct visitor forever — a slow
 * memory leak that only shows up in production traffic. Runs on an interval
 * rather than per-request so a burst of new visitors does not pay for it.
 */
const sweepIntervalMs = Math.max(windowMs, 60_000);
const sweepTimer = setInterval(() => {
  const cutoff = Date.now() - windowMs;
  let removed = 0;
  for (const [key, timestamps] of hits) {
    const newest = timestamps[timestamps.length - 1];
    if (newest === undefined || newest <= cutoff) {
      hits.delete(key);
      removed++;
    }
  }
  if (removed > 0) logger.debug('rate limiter swept idle keys', { removed });
}, sweepIntervalMs);

// Do not hold the event loop open on shutdown.
sweepTimer.unref();

/** Exposed for tests. */
export function resetRateLimiter(): void {
  hits.clear();
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const organizationId = req.organizationId;

  // visitor_id lives in the body, which is why this middleware must sit
  // after the JSON body parser. Requests without one (malformed payloads)
  // are passed through to schema validation, which produces a far more
  // useful 400 than a 429 would.
  const visitorId = (req.body as { visitor_id?: unknown } | undefined)?.visitor_id;

  if (!organizationId || typeof visitorId !== 'string' || visitorId.length === 0) {
    next();
    return;
  }

  const retryAfter = consume(keyFor(organizationId, visitorId), Date.now());

  if (retryAfter !== null) {
    res.setHeader('Retry-After', String(retryAfter));
    logger.warn('rate limited', { org_id: organizationId, visitor_id: visitorId });
    next(
      tooManyRequests(
        `Too many events for this visitor. Retry in ${retryAfter}s.`,
        { retry_after_seconds: retryAfter },
      ),
    );
    return;
  }

  next();
}
