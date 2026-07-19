const FLOW = [
  {
    label: 'Your storefront stays exactly as it is',
    body: 'One small script tag, added once. It doesn’t touch checkout, doesn’t change your theme, and doesn’t require ripping out whatever analytics you already run alongside it.',
  },
  {
    label: 'It watches quietly in the background',
    body: 'Every product view, search, and cart add gets recorded against a visitor ID your storefront never has to think about — no anonymous-user table to maintain, no extra database to run.',
  },
  {
    label: 'Your existing checkout or contact flow does the identifying',
    body: 'You don’t add a new "who are you" step. The moment your existing checkout, WhatsApp chat, or contact form captures a phone number or email, that identity links back to everything the visitor already did.',
  },
  {
    label: 'The dashboard is where you actually work',
    body: 'Instead of exporting raw analytics and cross-referencing spreadsheets, you open one screen that already knows who’s ready to be messaged and what they were looking at.',
  },
];

export default function ProductPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl text-ink-900 dark:text-ink-50">
        Sits alongside your store, not instead of it
      </h1>
      <p className="mt-5 text-lg text-ink-600 dark:text-ink-400">
        LeadCapsule isn&rsquo;t a replacement for your storefront, your CRM, or
        whatever you already use to run checkout. It fills a gap those tools
        leave open: the browsing that happens before someone becomes a
        customer, and the moment it stops being anonymous.
      </p>

      <div className="mt-14 space-y-10">
        {FLOW.map((step, i) => (
          <div key={step.label} className="flex gap-5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-mint-100 font-display text-lg text-mint-800 dark:bg-mint-950 dark:text-mint-300">
              {i + 1}
            </span>
            <div>
              <h2 className="font-display text-xl text-ink-900 dark:text-ink-100">{step.label}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <p className="text-sm text-ink-600 dark:text-ink-400">
          In practice: an e-commerce store keeps Shopify for checkout and
          inventory, keeps its usual customer-support tools for conversations
          already in progress, and adds LeadCapsule as the layer that catches
          everyone in between — the visitor who searched, looked at three
          products, and left, whose identity only shows up later.
        </p>
      </div>
    </section>
  );
}
