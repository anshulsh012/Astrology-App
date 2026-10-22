import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { login, roleArea } from '../services/auth'

type FieldErrors = {
  email?: string
  password?: string
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  if (!password) errors.password = 'Password is required'
  return errors
}

function nextPath(from: unknown, fallback: string) {
  if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }
  return fallback
}

export function LoginPage() {
  const { status, user, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated' && user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={nextPath(from, roleArea(user.role))} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const errors = validate(email, password)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    setServerError(null)
    setFieldErrors({})
    try {
      const result = await login({ email, password })
      if (result.ok) {
        signIn(result.user)
        const from = (location.state as { from?: string } | null)?.from
        navigate(nextPath(from, roleArea(result.user.role)), { replace: true })
        return
      }
      setServerError(result.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Account</p>
      <h1 className="mt-3 font-serif text-4xl text-cream">Login</h1>
      <p className="mt-3 text-sm leading-relaxed text-lavender">
        Sign in with an existing account. A valid session cookie is stored by the API; this form
        does not invent a successful login.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-line bg-card p-6" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-sm text-mist">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFieldErrors((current) => ({ ...current, email: undefined }))
              setServerError(null)
            }}
            className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-xs text-gold-soft">{fieldErrors.email}</p>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-mist">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setFieldErrors((current) => ({ ...current, password: undefined }))
              setServerError(null)
            }}
            className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
          />
          {fieldErrors.password ? (
            <p className="mt-1 text-xs text-gold-soft">{fieldErrors.password}</p>
          ) : null}
        </label>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Continue'}
        </Button>
        {serverError ? (
          <p role="alert" className="text-sm leading-relaxed text-gold-soft">
            {serverError}
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-sm text-lavender">
        Need an account?{' '}
        <Link to="/register" className="text-gold hover:text-gold-soft">
          Register
        </Link>
      </p>
    </section>
  )
}
