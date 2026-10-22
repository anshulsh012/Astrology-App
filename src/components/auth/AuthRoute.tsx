import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { roleArea } from '../../services/auth'
import type { AuthRole } from '../../types/auth'
import { Button } from '../ui/Button'

type AuthRouteProps = {
  children: ReactNode
  require?: AuthRole
}

export function AuthRoute({ children, require }: AuthRouteProps) {
  const location = useLocation()
  const { status, user, error, refresh } = useAuth()

  if (status === 'loading') {
    return <AuthLoading />
  }

  if (status === 'error') {
    return (
      <AuthError
        message={error}
        onRetry={() => {
          void refresh()
        }}
      />
    )
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (require && user.role !== require) {
    return <Navigate to={roleArea(user.role)} replace />
  }

  return <>{children}</>
}

export function AuthLoading() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm text-lavender">Checking session…</p>
    </section>
  )
}

export function AuthError({
  message,
  onRetry,
}: {
  message: string | null
  onRetry: () => void
}) {
  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
        Session check failed
      </p>
      <h1 className="mt-3 font-serif text-3xl text-cream">We could not verify your session</h1>
      <p className="mt-3 text-sm leading-relaxed text-lavender">
        {message ?? 'The authentication service is unavailable right now.'}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={onRetry}>
          Retry
        </Button>
        <Button to="/" variant="gold-outline">
          Back to home
        </Button>
      </div>
      <p className="mt-6 text-xs text-lavender-muted">
        Public browsing stays available from{' '}
        <Link to="/astrologers" className="text-gold hover:text-gold-soft">
          the directory
        </Link>
        .
      </p>
    </section>
  )
}
