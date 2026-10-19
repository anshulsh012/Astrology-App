import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { roleArea, type AuthRole } from '../hooks/useAuth';

export interface AuthRouteProps {
  children: ReactNode;
  require?: AuthRole;
}

/**
 * Wrapper that redirects unauthenticated users to `/login` and, when a role
 * is required, redirects users without that role to their home area.
 * This is a convenience for UX, not a security boundary — real access
 * control happens in the backend.
 *
 * Every branch terminates: loading renders a spinner, a failed session check
 * renders a retryable error, and only a resolved 401 redirects.
 */
export function AuthRoute({ children, require }: AuthRouteProps): ReactNode {
  const location = useLocation();
  const { status, user, error, refresh } = useAuth();

  if (status === 'loading') {
    return <AuthLoading />;
  }

  if (status === 'error') {
    return (
      <AuthError
        message={error}
        onRetry={() => {
          void refresh();
        }}
      />
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (require && user.role !== require) {
    return <Navigate to={roleArea(user.role)} replace />;
  }

  return <>{children}</>;
}

export function AuthLoading(): ReactNode {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-space-900">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-nebula-400 border-t-transparent" />
      <p className="text-sm text-white/60">Checking session…</p>
    </div>
  );
}

export function AuthError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}): ReactNode {
  return (
    <div className="cosmic-bg flex min-h-screen flex-col items-center justify-center gap-4 bg-space-900 px-4 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Session check failed</p>
      <h1 className="font-display text-2xl text-white">We couldn&apos;t verify your session</h1>
      <p className="max-w-md text-sm leading-relaxed text-white/60">
        {message ?? 'The authentication service is unavailable right now.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-5 py-2 text-sm font-medium text-space-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-gold-400/60"
        >
          Retry
        </button>
        <Link
          to="/"
          className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:border-gold-400/50 hover:text-gold-300"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
