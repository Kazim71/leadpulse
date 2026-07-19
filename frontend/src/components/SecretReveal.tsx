'use client';

import { useState } from 'react';

/**
 * One-time secret display with copy-to-clipboard.
 *
 * The "shown once" framing is a deliberate UX convention rather than a
 * technical constraint — a platform admin can always re-read api_key from
 * the organizations table. Presenting it as one-time trains the right habit
 * (store it now, in a password manager) and matches what every other
 * platform does with API keys, so nobody is surprised later when we DO make
 * it non-retrievable.
 */
export function SecretReveal({ label, value, note }: { label: string; value: string; note: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API needs a secure context; the value is selectable anyway.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-peach-300 bg-peach-100 p-4 dark:border-peach-700 dark:bg-peach-900/40">
      <p className="text-2xs font-medium uppercase tracking-wider text-peach-700 dark:text-peach-300">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded border border-peach-300 bg-white px-3 py-2 font-mono text-xs text-ink-900 dark:border-peach-700 dark:bg-ink-950 dark:text-ink-100">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="flex-none rounded-md bg-ink-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-ink-800 dark:bg-ink-100 dark:text-ink-900 dark:hover:bg-white"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 text-xs text-peach-700 dark:text-peach-300">{note}</p>
    </div>
  );
}
