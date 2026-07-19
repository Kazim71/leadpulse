# Phase 3 — tracking snippet: build & test

## Build

```bash
cd tracking-snippet
npm install
npm run build
```

Produces `dist/leadpulse-tracker.min.js`. The build script fails (non-zero
exit) if the bundle exceeds 5kb or contains `require(`/`import` — a standalone
theme script must never depend on a module loader existing on the host page.

Current size: **4.41 kb minified** (verified by the build script itself, not
eyeballed).

## Manual test — open the harness directly

No server needed for the harness page itself:

```
tracking-snippet/test/local.html
```

Double-click it, or open `file:///D:/Projects/Leadpulse/tracking-snippet/test/local.html`
in any browser. It requires the Phase 2 backend running at `http://localhost:4000`
(`cd backend && npm run dev`) — the tracker will fire real requests against it.

What you'll see:
- A `visitor_id` printed immediately below the heading.
- A dark log panel showing every request the tracker makes, with the actual
  HTTP status code returned by the server (not just "sent").
- 5 buttons: View Product, Search, View Category, Simulate Checkout
  (identify), and a rapid-click debounce test.

### CORS note

`test/local.html` is opened via `file://`, so the browser sends `Origin: null`
on every request. The Phase 2 backend's `CORS_ORIGINS=*` setting (translated
to `origin: true` in `server.ts`) reflects any origin, including `null`, so
this works without backend changes. If you tighten `CORS_ORIGINS` to a
specific allowlist later, `null` (the file:// origin) will need to be added
explicitly for this harness to keep working — production Shopify pages don't
have this problem since they load over `https://`.

## Automated verification (what I actually ran)

`test/verify.mjs` drives the harness in a real, installed Chrome via
`puppeteer-core` (CDP against your system Chrome — no bundled browser
download) and checks results against Supabase directly, not just the on-page
log:

```bash
npm run verify
```

It starts the Phase 2 backend itself, so nothing else needs to be running.
Checks performed, all against real network responses and real database rows:

1. `page_view` auto-fires on load and returns 202
2. the printed `visitor_id` matches `window.leadpulse.getVisitorId()`
3. all 4 buttons return success codes (202/202/202 for events, 200 for identify)
4. Supabase `events` table has exactly 4 new rows for that visitor, with the
   expected `event_type`s
5. `identify()` backfilled `contact_id` onto all 4 prior anonymous rows
6. reloading the page reuses the same `visitor_id`
7. rapid-clicking "View Product" 5 times produces **exactly 1** new row
   server-side (counted in Supabase before/after, not inferred from the code)

The script deletes everything it created (events, identity-map row, contact)
on exit, so re-running it never accumulates test data. It does not touch the
Phase 1 seed rows.

## Loading pattern for the real theme (Phase 4's job, documented here for reference)

```html
<script>
  window.leadpulseConfig = {
    apiBase: 'https://your-api-domain.example.com',
    apiKey: 'ORG_SPECIFIC_API_KEY',
  };
  // Stub so track()/identify() calls made before the real script loads are
  // queued instead of throwing "leadpulse is undefined". The real bundle
  // adopts window.leadpulse.q on init and replays it — see tracker.ts.
  window.leadpulse = window.leadpulse || { q: [],
    track: function () { this.q.push(['track', Array.prototype.slice.call(arguments)]); },
    identify: function () { this.q.push(['identify', Array.prototype.slice.call(arguments)]); } };
</script>
<script src="https://your-cdn.example.com/leadpulse-tracker.min.js" defer></script>
```

`defer` (not `async`) keeps script execution order relative to other deferred
scripts while still not blocking parse — appropriate for a tag pasted near the
top of `theme.liquid`. `async` also works if load-order relative to other
scripts doesn't matter.

## Known limitations (by design, not oversights)

- **No product/category/search page auto-detection.** Every event beyond the
  initial `page_view` requires an explicit `track()` call from theme code.
  See the comment in `src/tracker.ts` above `doTrack('page_view')` for why
  URL-pattern guessing was rejected.
- **No retry on network failure.** A dropped request is dropped. Flagged as a
  TODO in `src/api.ts`.
- **No idempotency key.** A double-fired event (e.g. a network retry at the
  browser/OS level) creates a duplicate row. Matches the Phase 2 decision to
  defer this.
