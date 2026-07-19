export interface LeadpulseConfig {
  apiBase: string;
  apiKey: string;
  /** Enables console.warn on network failure. Defaults to true on localhost. */
  debug?: boolean;
}

export interface RequestOutcome {
  endpoint: string;
  status: number | null;
  ok: boolean;
  error?: string;
}

/**
 * Observability hook for the host page.
 *
 * Every request result is dispatched as a DOM CustomEvent rather than
 * returned to the caller: track() is fire-and-forget by design, so there is
 * no promise for a caller to await. The local test harness listens for this
 * to render real HTTP status codes in its log panel; production pages simply
 * ignore it. Costs nothing when nobody is listening.
 */
export const REQUEST_EVENT = 'leadpulse:request';

function emitOutcome(outcome: RequestOutcome): void {
  try {
    window.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: outcome }));
  } catch {
    /* CustomEvent unavailable in a very old browser — not worth a polyfill */
  }
}

function warn(config: LeadpulseConfig, message: string, detail?: unknown): void {
  if (config.debug) {
    console.warn('[leadpulse] ' + message, detail ?? '');
  }
}

async function post(
  config: LeadpulseConfig,
  path: string,
  body: unknown,
): Promise<void> {
  const url = config.apiBase.replace(/\/+$/, '') + path;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify(body),
      // Lets the request outlive the document. Without it, tracking a click
      // that navigates away is a race the navigation usually wins, and the
      // event is lost exactly when it is most interesting.
      keepalive: true,
      // Analytics must never carry the visitor's session cookies to a
      // third-party origin.
      credentials: 'omit',
      mode: 'cors',
    });

    emitOutcome({ endpoint: path, status: response.status, ok: response.ok });

    if (!response.ok) {
      warn(config, 'request to ' + path + ' returned ' + response.status);
    }
  } catch (err) {
    // TODO(post-MVP): no retry and no offline queue. A dropped event is
    // silently lost. Adding a bounded retry with backoff, or buffering into
    // localStorage and flushing on next page load, is the obvious next step —
    // deliberately deferred to keep the pasted-into-theme bundle small.
    const message = err instanceof Error ? err.message : String(err);
    emitOutcome({ endpoint: path, status: null, ok: false, error: message });
    warn(config, 'request to ' + path + ' failed', message);
  }
}

export function postEvent(config: LeadpulseConfig, payload: unknown): void {
  void post(config, '/api/events', payload);
}

export function postIdentify(config: LeadpulseConfig, payload: unknown): void {
  void post(config, '/api/identify', payload);
}
