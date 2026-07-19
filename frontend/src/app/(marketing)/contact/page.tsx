import { ContactForm } from '@/components/marketing/ContactForm';

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-lg px-6 py-20">
      <h1 className="font-display text-4xl text-ink-900 dark:text-ink-50">Get in touch</h1>
      <p className="mt-4 text-ink-600 dark:text-ink-400">
        Questions about LeadCapsule, or want to get your storefront set up?
        Send a message below.
      </p>

      <div className="mt-10">
        <ContactForm />
      </div>
    </section>
  );
}
