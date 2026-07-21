'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Inserts directly into contact_inquiries via the anon-key browser client —
 * the same client every other browser-side read in this app uses. RLS
 * (0004_contact_inquiries.sql) is what actually allows this: an anonymous
 * visitor with no session gets INSERT-only access to this one table, and
 * nothing else.
 *
 * No email is sent on submit — no SMTP is configured anywhere in this
 * project (same gap already tracked in docs/TODO.md for admin invites).
 * The success state below is honest about that: it confirms the message
 * was recorded, not that anyone has been notified.
 */
export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('pending');
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('contact_inquiries')
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() });

    if (insertError) {
      setStatus('error');
      setError(insertError.message);
      return;
    }

    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-brand-ivory p-7 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="font-marketingDisplay text-2xl text-black dark:text-white">Message received</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Thanks — your message has been recorded. There&rsquo;s no automatic email
          reply yet, so a real person will follow up directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Name" value={name} onChange={setName} required maxLength={200} />
      <Field label="Email" type="email" value={email} onChange={setEmail} required maxLength={320} />

      <label className="block">
        <span className="mb-2 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
          Message
        </span>
        <textarea
          value={message}
          required
          maxLength={5000}
          rows={5}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-neutral-400 focus:border-cinnamon-500 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cinnamon-500"
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-brick-700/60 bg-brick-900/40 px-3.5 py-2.5 text-xs text-brick-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'pending'}
        className="w-full rounded-full bg-cinnamon-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-cinnamon-500 dark:hover:bg-cinnamon-400"
      >
        {status === 'pending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-black placeholder:text-neutral-400 focus:border-cinnamon-500 focus:outline-none dark:border-neutral-800 dark:bg-black dark:text-white dark:placeholder:text-neutral-500 dark:focus:border-cinnamon-500"
      />
    </label>
  );
}
