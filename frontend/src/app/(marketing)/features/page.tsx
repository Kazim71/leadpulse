/**
 * Every item below was verified against the actual codebase before being
 * written — not assumed. In particular:
 *   - the 11 tracked event types are exactly EVENT_TYPES in
 *     backend/src/modules/events/events.schema.ts
 *   - "always-current," not "real-time": dashboard pages are Server
 *     Components fetching on each request (force-dynamic), not a
 *     websocket/polling live feed. Claiming "real-time" would overstate
 *     what's actually built.
 *   - CSV export is NOT listed — confirmed absent via `grep -rn -i csv
 *     frontend/src` before writing this page. It's tracked in
 *     docs/TODO.md as not yet built.
 */
const FEATURES = [
  {
    title: 'Anonymous visitor tracking',
    body: 'A lightweight snippet (under 5kb, no dependencies) records page views, searches, category views, product views, and cart adds — before a visitor is identified. Client-side debounce filters out duplicate fires from scroll handlers and double clicks.',
  },
  {
    title: 'Identity resolution',
    body: 'When a visitor gives up a phone number or email, every anonymous event tied to their visitor ID is retroactively linked to that contact in a single atomic operation — no partial state if it fails partway through.',
  },
  {
    title: 'Multi-tenant, isolated at the database level',
    body: "Each organization's contacts and events are enforced separately by Postgres row-level security, not just filtered in application code. A platform admin can see across every organization; an individual organization's admin cannot see any other tenant's data, even by guessing a URL.",
  },
  {
    title: 'Ready-to-message status',
    body: "Every contact carries a status — ready, cooldown, messaged, or none — so the dashboard can surface exactly who's worth reaching out to without reading through raw event logs.",
  },
  {
    title: 'Always-current dashboard',
    body: 'Leads, summary stats, and activity charts reflect the data as of your most recent page load — a straightforward, request-time view rather than a delayed batch report.',
  },
  {
    title: 'Platform-wide oversight',
    body: 'A separate super-admin view aggregates activity across every client organization, with drill-down into any individual tenant — for the platform operator, not for individual clients.',
  },
];

export default function FeaturesPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-marketingDisplay text-5xl text-black dark:text-white sm:text-6xl">Features</h1>
      <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-400">
        What&rsquo;s built and working today — not a roadmap.
      </p>

      <div className="mt-16 space-y-12">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="flex gap-6 border-t border-neutral-200 dark:border-neutral-800 pt-8 first:border-t-0 first:pt-0"
          >
            <span className="flex-none font-marketingDisplay text-2xl text-neutral-500 dark:text-neutral-500">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="font-marketingDisplay text-xl text-black dark:text-white">{f.title}</h2>
              <p className="mt-2 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
