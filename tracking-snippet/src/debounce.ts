/**
 * Client-side duplicate suppression.
 *
 * This is NOT the same job as the server-side rate limiter from Phase 2, and
 * neither replaces the other:
 *   - Here: a correct-but-noisy page fires the same event twice — a scroll
 *     handler re-entering, a double-clicked button, a framework re-render.
 *     Dropping locally saves a pointless network round-trip.
 *   - Server: a broken or hostile client ignores all of this and floods the
 *     endpoint. Only the server can defend against that, because the client
 *     is the thing that is broken.
 */

const WINDOW_MS = 2000;
const MAX_ENTRIES = 50;

/**
 * key ("eventType:url") -> last fired timestamp.
 *
 * A Map iterates in insertion order, which gives LRU eviction for free: on
 * every write we delete the key first, so re-setting moves it to the end and
 * the oldest entry is always the first one iteration yields.
 *
 * Capped because a long-lived SPA session visiting hundreds of URLs would
 * otherwise grow this forever — a slow leak in exactly the long sessions
 * that matter most.
 */
const lastFired = new Map<string, number>();

function evictOldest(): void {
  while (lastFired.size > MAX_ENTRIES) {
    const oldestKey = lastFired.keys().next().value as string | undefined;
    if (oldestKey === undefined) break;
    lastFired.delete(oldestKey);
  }
}

/**
 * Returns true when this event should be dropped as a duplicate.
 * Records the fire time as a side effect when the event is allowed.
 */
export function shouldDropAsDuplicate(
  eventType: string,
  url: string,
  now: number = Date.now(),
): boolean {
  const key = eventType + ':' + url;
  const previous = lastFired.get(key);

  if (previous !== undefined && now - previous < WINDOW_MS) {
    return true;
  }

  // Delete-then-set so this key moves to the most-recent position.
  lastFired.delete(key);
  lastFired.set(key, now);
  evictOldest();
  return false;
}

/** Test-harness escape hatch. */
export function resetDebounce(): void {
  lastFired.clear();
}

export const DEBOUNCE_WINDOW_MS = WINDOW_MS;
export const DEBOUNCE_MAX_ENTRIES = MAX_ENTRIES;
