import { getVisitorId } from './visitorId.js';
import { shouldDropAsDuplicate } from './debounce.js';
import { postEvent, postIdentify, type LeadpulseConfig } from './api.js';

/**
 * Must stay identical to EVENT_TYPES in
 * backend/src/modules/events/events.schema.ts. The backend rejects anything
 * else with a 400, so validating here turns a wasted round-trip into an
 * immediate console error naming the offending event.
 *
 * Casing is inconsistent (snake_case for page-level views, camelCase for
 * interactions) because it mirrors the SaleAssist convention exactly.
 * Normalizing it would break correspondence with the backend enum.
 */
const EVENT_TYPES = [
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

type EventType = (typeof EVENT_TYPES)[number];

const EVENT_TYPE_SET: Record<string, true> = {};
for (const t of EVENT_TYPES) EVENT_TYPE_SET[t] = true;

interface TrackData {
  view_data?: { url?: string; [key: string]: unknown };
  actionField?: Record<string, unknown>;
  products?: unknown[];
  promotions?: unknown[];
  [key: string]: unknown;
}

interface IdentifyData {
  phone?: string;
  email?: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  [key: string]: unknown;
}

type QueuedCall = ['track', [string, TrackData?]] | ['identify', [IdentifyData]];

interface LeadpulseApi {
  track(eventName: string, data?: TrackData): void;
  identify(data: IdentifyData): void;
  /** Pre-init queue. Present on the inline stub; drained on init. */
  q?: QueuedCall[];
  /** Exposed for the test harness and for theme debugging. */
  getVisitorId?(): string | null;
  version?: string;
}

declare global {
  interface Window {
    leadpulse?: LeadpulseApi;
    leadpulseConfig?: Partial<LeadpulseConfig>;
  }
}

const VERSION = '0.1.0';

let config: LeadpulseConfig | null = null;
let ready = false;
const queue: QueuedCall[] = [];

function isLocalHost(apiBase: string): boolean {
  return /localhost|127\.0\.0\.1|\[::1\]/.test(apiBase);
}

/**
 * Reads window.leadpulseConfig. Returns null (and explains why on the
 * console) rather than throwing: a misconfigured analytics tag must degrade
 * to doing nothing, never take the host page's checkout down with it.
 */
function readConfig(): LeadpulseConfig | null {
  const raw = window.leadpulseConfig;

  if (!raw || typeof raw !== 'object') {
    console.error(
      '[leadpulse] window.leadpulseConfig is missing. Define it BEFORE loading ' +
        'the tracker:\n' +
        "  window.leadpulseConfig = { apiBase: 'https://api.example.com', apiKey: '...' };\n" +
        'Tracking is disabled for this page load.',
    );
    return null;
  }

  const { apiBase, apiKey } = raw;

  if (typeof apiBase !== 'string' || apiBase.length === 0) {
    console.error('[leadpulse] leadpulseConfig.apiBase is missing. Tracking disabled.');
    return null;
  }
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    console.error('[leadpulse] leadpulseConfig.apiKey is missing. Tracking disabled.');
    return null;
  }

  return {
    apiBase,
    apiKey,
    debug: typeof raw.debug === 'boolean' ? raw.debug : isLocalHost(apiBase),
  };
}

function currentUrl(data?: TrackData): string {
  const explicit = data?.view_data?.url;
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;
  try {
    return window.location.href;
  } catch {
    return '';
  }
}

function doTrack(eventName: string, data?: TrackData): void {
  if (!config) return;

  if (!EVENT_TYPE_SET[eventName]) {
    console.error(
      '[leadpulse] unknown event type "' +
        eventName +
        '". Expected one of: ' +
        EVENT_TYPES.join(', '),
    );
    return;
  }

  const url = currentUrl(data);

  if (shouldDropAsDuplicate(eventName, url)) return;

  const { view_data, ...rest } = data ?? {};

  // Shape matches the backend's events.schema.ts: typed fields at the top
  // level, everything else passed through into the metadata jsonb.
  postEvent(config, {
    event_type: eventName as EventType,
    visitor_id: getVisitorId(),
    view_data: { ...(view_data ?? {}), url },
    ...rest,
  });
}

function doIdentify(data: IdentifyData): void {
  if (!config) return;

  if (!data || (!data.phone && !data.email)) {
    console.error('[leadpulse] identify() requires at least one of phone or email.');
    return;
  }

  // Not debounced: identify is user-intent-driven (a form submit), never
  // fired by scroll or re-render, and dropping one loses a real lead.
  postIdentify(config, { visitor_id: getVisitorId(), ...data });
}

function flushQueue(pending: QueuedCall[]): void {
  for (const call of pending) {
    try {
      if (call[0] === 'track') doTrack(call[1][0], call[1][1]);
      else if (call[0] === 'identify') doIdentify(call[1][0]);
    } catch (err) {
      console.error('[leadpulse] queued call failed', err);
    }
  }
}

/**
 * Public API. Installed synchronously at script execution so that a call
 * arriving mid-init is queued rather than lost — and so that a theme's
 * inline stub (see TESTING.md) can hand over its own queue.
 */
const api: LeadpulseApi = {
  track(eventName: string, data?: TrackData): void {
    if (!ready) {
      queue.push(['track', [eventName, data]]);
      return;
    }
    doTrack(eventName, data);
  },
  identify(data: IdentifyData): void {
    if (!ready) {
      queue.push(['identify', [data]]);
      return;
    }
    doIdentify(data);
  },
  getVisitorId(): string | null {
    return config ? getVisitorId() : null;
  },
  version: VERSION,
};

function init(): void {
  // A stub installed inline by the theme may have collected calls before
  // this bundle finished downloading. Adopt its queue before replacing it.
  const stub = window.leadpulse;
  const stubQueue: QueuedCall[] =
    stub && Array.isArray(stub.q) ? (stub.q as QueuedCall[]) : [];

  window.leadpulse = api;

  config = readConfig();

  if (!config) {
    // Stay installed as a no-op. Calls are accepted and dropped rather than
    // throwing TypeError on an undefined window.leadpulse.
    ready = true;
    queue.length = 0;
    return;
  }

  ready = true;

  flushQueue(stubQueue);
  flushQueue(queue.splice(0, queue.length));

  // ------------------------------------------------------------------
  // The single auto-fired event.
  //
  // Product / category / search views are deliberately NOT auto-detected
  // from URL patterns. Doing so would mean shipping guesses like
  // /products/ => product_view, which:
  //   - is Shopify-specific and breaks on every headless or custom theme,
  //   - breaks again the moment a merchant changes a URL prefix or adds a
  //     locale segment (/en-in/products/...),
  //   - produces silently WRONG analytics rather than missing analytics,
  //     which is far more expensive to discover and undo,
  //   - cannot populate products[] anyway — the SKU, price and variant only
  //     exist in the theme's own template context.
  // The theme calls track() explicitly with real data instead. That wiring
  // is Phase 4.
  // ------------------------------------------------------------------
  doTrack('page_view');
}

init();
