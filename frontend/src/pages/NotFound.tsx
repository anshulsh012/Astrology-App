import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Simple 404 page rendered inside the layout. */
export default function NotFound(): ReactNode {
  return (
    <section className="cosmic-bg flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-7xl gold-text">404</p>
      <h1 className="font-display text-3xl text-white">This page is in another constellation</h1>
      <p className="max-w-md text-sm text-white/55">
        The page you are looking for doesn&apos;t exist yet.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-full border border-gold-400/60 bg-gold-400/10 px-6 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold-400/20"
      >
        Back to home
      </Link>
    </section>
  );
}