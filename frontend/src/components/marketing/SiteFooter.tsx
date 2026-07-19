export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 dark:border-ink-800">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-ink-500 dark:text-ink-400">
        <p>© {new Date().getFullYear()} LeadCapsule</p>
      </div>
    </footer>
  );
}
