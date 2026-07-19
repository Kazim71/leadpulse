export default function AboutPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-display text-4xl text-ink-900 dark:text-ink-50">About LeadCapsule</h1>

      <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-700 dark:text-ink-300">
        <p>
          Every e-commerce or SaaS storefront can tell you what someone bought.
          Almost none of them can tell you about the visit that almost turned
          into a purchase — the product page someone lingered on, the search
          that didn&rsquo;t convert, the cart they filled and abandoned. That
          browsing history exists in your analytics somewhere, but it&rsquo;s
          disconnected from any real person until they hand over a phone
          number or email.
        </p>
        <p>
          LeadCapsule captures that anonymous behavior as it happens — page
          views, searches, product interest, cart activity — and holds onto
          it. The moment a visitor identifies themselves, at checkout, in a
          WhatsApp message, on a contact form, their entire prior browsing
          history links to that one contact. What was previously a stranger
          browsing your site becomes a lead with a complete activity trail
          attached, ready to be messaged.
        </p>
        <p>
          It&rsquo;s built as a multi-tenant platform: each client organization&rsquo;s
          data is isolated at the database level, not just hidden behind a
          login screen, so the same system serves multiple storefronts
          without their leads ever mixing.
        </p>
      </div>
    </section>
  );
}
