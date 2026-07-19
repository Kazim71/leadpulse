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
      <div className="rounded-lg border border-mint-300 bg-mint-100 p-6 text-center dark:border-mint-700 dark:bg-mint-950/40">
        <h2 className="font-display text-xl text-mint-800 dark:text-mint-300">Message received</h2>
        <p className="mt-2 text-sm text-mint-700 dark:text-mint-300">
          Thanks — your message has been recorded. There&rsquo;s no automatic email
          reply yet, so a real person will follow up directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name" value={name} onChange={setName} required maxLength={200} />
      <Field label="Email" type="email" value={email} onChange={setEmail} required maxLength={320} />

      <label className="block">
        <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Message
        </span>
        <textarea
          value={message}
          required
          maxLength={5000}
          rows={5}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-blush-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />
      </label>

      {error ? (
        <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'pending'}
        className="w-full rounded-md bg-blush-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blush-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-ink-500 dark:text-ink-400">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-blush-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
      />
    </label>
  );
}
