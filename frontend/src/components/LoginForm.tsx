import { useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { performLogin } from '../hooks/useAuth';
import type { AuthUser } from '../hooks/useAuth';

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormState {
  values: LoginFormValues;
  errors: Partial<LoginFormValues>;
  serverError: string | null;
  loading: boolean;
}

export function validateLogin(values: LoginFormValues): Partial<LoginFormValues> {
  const errors: Partial<LoginFormValues> = {};
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
}

interface Props {
  onSuccess?: (user: AuthUser) => void;
}

export default function LoginForm({ onSuccess }: Props): ReactNode {
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginFormValues>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear field error on edit.
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateLogin(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError(null);
    try {
      const result = await performLogin(values.email.trim(), values.password);
      if (result.ok && result.user) {
        onSuccess?.(result.user);
      } else {
        setServerError(result.message ?? 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="rounded-xl border border-white/8 bg-space-850/60 p-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-white/55">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-gold-300 transition hover:text-gold-400"
          >
            Create one
          </Link>
        </div>

        <h2 className="font-display text-2xl text-white">Sign in</h2>
        <p className="mt-2 text-sm text-white/55">
          Enter your credentials to access your area.
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-space-850/60 p-6">
        <label className="mb-2 block text-sm text-white/70">
          Email
          <div className="mt-1 relative">
            <Mail
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="peer w-full rounded-lg border border-white/10 bg-space-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 transition focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              autoComplete="email"
              autoFocus
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-300" id="email-error">
              {errors.email}
            </p>
          )}
        </label>

        <label className="mb-4 block text-sm text-white/70">
          Password
          <div className="mt-1 relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="password"
              name="password"
              value={values.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="peer w-full rounded-lg border border-white/10 bg-space-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 transition focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              autoComplete="current-password"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-300" id="password-error">
              {errors.password}
            </p>
          )}
        </label>

        {serverError && (
          <p className="mb-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-2.5 text-sm font-medium text-space-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-gold-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-space-950 border-t-transparent" />
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </div>

      <p className="text-center text-xs text-white/40">
        This is a Phase 1 foundation — real astrologer dashboards and
        bookings are not implemented yet.
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-white/40 transition hover:text-gold-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to home
      </Link>
    </form>
  );
}