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
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-28 text-center sm:pt-36">
        <h1 className="font-marketingDisplay text-5xl leading-[1.05] text-black dark:text-white sm:text-6xl lg:text-7xl">
          See who&rsquo;s about to buy, before they leave
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          Your storefront shows you completed purchases — not the browsing that
          almost became one. NorthQu captures that anonymous intent as it
          happens and turns it into a ready-to-message lead list, the moment a
          visitor gives up a phone number or email.
        </p>
        <div className="mt-11 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-cinnamon-600 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
          >
            Log in to your dashboard
          </Link>
          <Link
            href="/product"
            className="rounded-full border border-neutral-200 dark:border-neutral-800 px-7 py-3.5 text-sm font-medium text-black dark:text-white transition-colors hover:border-cinnamon-500 hover:text-cinnamon-600 dark:hover:border-cinnamon-400 dark:hover:text-cinnamon-400"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* ---- How it works — vertical timeline ---------------------------- */}
      <section className="border-t border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            How it works
          </h2>
          <ol className="relative mt-16 space-y-14 border-l border-neutral-200 dark:border-neutral-800 pl-10">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="absolute -left-[3.35rem] flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 font-marketingDisplay text-base text-black dark:text-white">
                  {i + 1}
                </span>
                <h3 className="font-marketingDisplay text-2xl text-black dark:text-white">{step.title}</h3>
                <p className="mt-2.5 max-w-xl text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Capabilities ------------------------------------------------ */}
      <section className="border-t border-neutral-200 dark:border-neutral-800/80 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
            What&rsquo;s already built
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.label}
                className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 p-7 transition-colors hover:border-cinnamon-500/50 dark:hover:border-cinnamon-400/50"
              >
                <h3 className="font-marketingDisplay text-xl text-black dark:text-white">{cap.label}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{cap.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Final CTA ----------------------------------------------------- */}
      <section className="border-t border-neutral-200 dark:border-neutral-800/80 py-24 text-center">
        <h2 className="font-marketingDisplay text-3xl text-black dark:text-white sm:text-4xl">
          Ready to see who&rsquo;s worth messaging?
        </h2>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-full bg-cinnamon-600 px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
        >
          Log in to your dashboard
        </Link>
      </section>
    </div>
  );
}
