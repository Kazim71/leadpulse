import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';

const STEPS = [
  {
    title: 'A visitor browses, anonymously',
    body: 'Every page view, search, product view, and cart add is captured the moment it happens — before you know who they are.',
  },
  {
    title: 'They give up an identity',
    body: 'The moment a phone number or email shows up — at checkout, in a WhatsApp chat, on a form — their entire browsing history links to that one contact.',
  },
  {
    title: 'Your dashboard shows who to message',
    body: "No digging through raw event logs. The dashboard surfaces exactly who's ready to contact, with their full activity trail attached.",
  },
];

const CAPABILITIES = [
  { label: 'Anonymous tracking', detail: 'Page views, searches, product views, and cart activity — captured before identity is known.' },
  { label: 'Identity resolution', detail: 'One phone number or email links a visitor’s entire prior browsing history to a real contact.' },
  { label: 'Multi-tenant by design', detail: 'Every organization’s data is isolated at the database level, not just hidden in the UI.' },
  { label: 'Ready-to-message flagging', detail: 'Leads are marked by status, so you know who to reach out to without reading every event.' },
];

/**
 * Auth-aware routing lives ONLY here, reusing getViewer() rather than
 * reimplementing role resolution. Logged-in visitors never see this
 * markup — they're redirected before anything below renders. The four
 * other public pages have no auth check at all; they're static regardless
 * of session state.
 */
export default async function LandingPage() {
  const viewer = await getViewer();

  if (viewer.kind === 'platform_admin') redirect('/super-admin');
  if (viewer.kind === 'org_admin') redirect('/dashboard');
  if (viewer.kind === 'unassigned') redirect('/pending');
  // viewer.kind === 'anonymous' falls through to the landing page below.

  return (
    <div>
      {/* ---- Hero ------------------------------------------------------ */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-32">
        <h1 className="font-display text-4xl leading-tight text-ink-900 dark:text-ink-50 sm:text-5xl">
          See who&rsquo;s about to buy, before they leave
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-600 dark:text-ink-400">
          Your storefront shows you completed purchases — not the browsing that
          almost became one. LeadCapsule captures that anonymous intent as it
          happens and turns it into a ready-to-message lead list, the moment a
          visitor gives up a phone number or email.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-md bg-blush-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blush-700"
          >
            Log in to your dashboard
          </Link>
          <Link
            href="/product"
            className="rounded-md border border-ink-200 px-6 py-3 text-sm font-medium text-ink-700 transition-colors hover:border-blush-300 hover:text-blush-700 dark:border-ink-700 dark:text-ink-300 dark:hover:text-blush-400"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* ---- How it works ------------------------------------------------ */}
      <section className="border-t border-ink-200 bg-white py-20 dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-3xl text-ink-900 dark:text-ink-50">
            How it works
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lilac-100 font-display text-lg text-lilac-800 dark:bg-lilac-950 dark:text-lilac-300">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-xl text-ink-900 dark:text-ink-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Capabilities ------------------------------------------------ */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-display text-3xl text-ink-900 dark:text-ink-50">
            What&rsquo;s already built
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {CAPABILITIES.map((cap, i) => {
              const tone = [
                'border-blush-200 dark:border-blush-900',
                'border-lilac-200 dark:border-lilac-900',
                'border-mint-200 dark:border-mint-900',
                'border-peach-200 dark:border-peach-900',
              ][i % 4];
              return (
                <div
                  key={cap.label}
                  className={`rounded-xl border bg-white p-6 shadow-card dark:bg-ink-900 ${tone}`}
                >
                  <h3 className="font-display text-lg text-ink-900 dark:text-ink-100">
                    {cap.label}
                  </h3>
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{cap.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- Final CTA ----------------------------------------------------- */}
      <section className="border-t border-ink-200 bg-white py-20 text-center dark:border-ink-800 dark:bg-ink-900">
        <h2 className="font-display text-2xl text-ink-900 dark:text-ink-50">
          Ready to see who&rsquo;s worth messaging?
        </h2>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-blush-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blush-700"
        >
          Log in to your dashboard
        </Link>
      </section>
    </div>
  );
}
