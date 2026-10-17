import type { ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

/** Route-level error UI (react-router `errorElement`). */
export default function RouteError(): ReactNode {
  const error = useRouteError();

  let title = 'Something went wrong';
  let detail = 'An unexpected error occurred while loading this page.';

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
    detail =
      error.status === 404
        ? 'The page you are looking for does not exist or has not been built yet.'
        : error.statusText;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-space-900 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-400">Nakshtra Tak</p>
      <h1 className="font-display text-4xl text-white">{title}</h1>
      <p className="max-w-md text-sm text-white/60">{detail}</p>
      <Link
        to="/"
        className="rounded-full border border-gold-400/60 bg-gold-400/10 px-6 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold-400/20"
      >
        Back to home
      </Link>
    </main>
  );
}