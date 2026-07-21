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
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-marketingDisplay text-5xl leading-tight text-black dark:text-white sm:text-6xl">
        Sits alongside your store, not instead of it
      </h1>
      <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
        NorthQu isn&rsquo;t a replacement for your storefront, your CRM, or
        whatever you already use to run checkout. It fills a gap those tools
        leave open: the browsing that happens before someone becomes a
        customer, and the moment it stops being anonymous.
      </p>

      <div className="mt-16 space-y-12">
        {FLOW.map((step, i) => (
          <div key={step.label} className="flex gap-6">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 font-marketingDisplay text-lg text-black dark:text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-marketingDisplay text-xl text-black dark:text-white">{step.label}</h2>
              <p className="mt-2.5 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-brand-ivory dark:bg-neutral-900 p-7">
        <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          In practice: an e-commerce store keeps Shopify for checkout and
          inventory, keeps its usual customer-support tools for conversations
          already in progress, and adds NorthQu as the layer that catches
          everyone in between — the visitor who searched, looked at three
          products, and left, whose identity only shows up later.
        </p>
      </div>
    </section>
  );
}
