import type { ReactNode } from 'react';

/** Suspense fallback shown while a lazily-loaded route chunk loads. */
export default function PageLoader({ label = 'Loading' }: { label?: string }): ReactNode {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-space-900"
      role="status"
      aria-live="polite"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-nebula-400 border-t-transparent" />
      <p className="text-sm text-white/60">{label}…</p>
    </div>
  );
}