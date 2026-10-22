import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { register, roleArea } from '../services/auth'

type FieldErrors = {
  email?: string
  password?: string
  confirm?: string
}

function validate(email: string, password: string, confirm: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address'
  }
  if (!password) errors.password = 'Password is required'
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
  if (confirm !== password) errors.confirm = 'Passwords do not match'
  return errors
}

export function RegisterPage() {
  const { status, user, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated' && user) {
    return <Navigate to={roleArea(user.role)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const errors = validate(email, password, confirm)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    setServerError(null)
    setFieldErrors({})
    try {
      const result = await register({ email, password })
      if (result.ok) {
        signIn(result.user)
        navigate(roleArea(result.user.role), { replace: true })
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
      <h1 className="mt-3 font-serif text-4xl text-cream">Create an account</h1>
      <p className="mt-3 text-sm leading-relaxed text-lavender">
        Public registration creates a customer account and starts a session when the API accepts
        it. Nothing is stored in the browser except the HttpOnly cookie set by the backend.
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
            minLength={8}
            autoComplete="new-password"
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
        <label className="block">
          <span className="mb-1.5 block text-sm text-mist">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              setFieldErrors((current) => ({ ...current, confirm: undefined }))
              setServerError(null)
            }}
            className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
          />
          {fieldErrors.confirm ? (
            <p className="mt-1 text-xs text-gold-soft">{fieldErrors.confirm}</p>
          ) : null}
        </label>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        {serverError ? (
          <p role="alert" className="text-sm leading-relaxed text-gold-soft">
            {serverError}
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-sm text-lavender">
        Already have an account?{' '}
        <Link to="/login" className="text-gold hover:text-gold-soft">
          Login
        </Link>
      </p>
    </section>
  )
}
