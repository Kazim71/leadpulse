const STORAGE_KEY = 'lp_visitor_id';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

let memoized: string | null = null;

/**
 * Generates a v4-shaped UUID.
 *
 * crypto.randomUUID() needs a secure context (https or localhost), so it is
 * absent on plain-http staging and on file:// pages. The Math.random()
 * fallback is NOT cryptographically strong, and does not need to be: this is
 * an analytics correlation id, not a session token or a secret. Collisions
 * are the only real risk and 122 bits of weak randomness is far past what
 * per-tenant visitor volumes require.
 */
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Some embedded webviews throw on crypto access rather than undefining it.
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Every storage access here is wrapped: localStorage throws (not returns
 * null) in Safari private mode and when a host page's CSP or cookie policy
 * blocks it. An analytics script must never break the page it runs on.
 */
function readLocalStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLocalStorage(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* quota exceeded, private mode, or storage disabled — cookie still holds it */
  }
}

function readCookie(): string | null {
  try {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + STORAGE_KEY + '=([^;]*)'),
    );
    return match ? decodeURIComponent(match[1] as string) : null;
  } catch {
    return null;
  }
}

function writeCookie(id: string): void {
  try {
    // Secure is attached only on https. Hardcoding it would make the cookie
    // silently fail to set during local http testing; omitting it entirely
    // would weaken production. Deriving it from the protocol gets both.
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      STORAGE_KEY +
      '=' +
      encodeURIComponent(id) +
      '; Max-Age=' +
      COOKIE_MAX_AGE_SECONDS +
      '; Path=/; SameSite=Lax' +
      secure;
  } catch {
    /* cookies disabled — localStorage still holds it */
  }
}

/**
 * Returns this browser's visitor id, creating and persisting one on first
 * call. Memoized: events fire in bursts and re-reading storage per event
 * costs a synchronous disk-backed read each time.
 *
 * WHY BOTH localStorage AND A COOKIE, rather than picking one:
 * they fail in different, non-overlapping ways.
 *   - Safari ITP caps JS-set cookies at 7 days and prunes them aggressively,
 *     so a cookie alone loses returning visitors within a week.
 *   - localStorage survives ITP far longer, but is unreadable by anything
 *     server-side — it never leaves the browser.
 * Keeping a cookie means a future server-side integration (a Shopify webhook,
 * an edge function, server-rendered personalization) can read the same id
 * that the client is using, without a round-trip to ask the page for it.
 * localStorage is the durable copy; the cookie is the server-readable copy.
 * On read we prefer localStorage precisely because it is the one that
 * outlives ITP, and we re-mirror it back into the cookie when the cookie has
 * been pruned but localStorage survived.
 */
export function getVisitorId(): string {
  if (memoized) return memoized;

  const fromLocal = readLocalStorage();
  if (fromLocal) {
    memoized = fromLocal;
    // Cookie may have been pruned by ITP while localStorage survived.
    // Re-mirror so the server-readable copy comes back.
    if (readCookie() !== fromLocal) writeCookie(fromLocal);
    return memoized;
  }

  const fromCookie = readCookie();
  if (fromCookie) {
    memoized = fromCookie;
    // localStorage was cleared but the cookie survived — restore the durable copy.
    writeLocalStorage(fromCookie);
    return memoized;
  }

  const generated = generateId();
  writeLocalStorage(generated);
  writeCookie(generated);
  memoized = generated;
  return memoized;
}

/** Test-harness escape hatch. Not part of the public tracker API. */
export function resetVisitorIdCache(): void {
  memoized = null;
}
