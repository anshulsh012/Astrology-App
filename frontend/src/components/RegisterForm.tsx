import { useState, type FormEvent, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, ShieldCheck, User } from 'lucide-react';
import { performRegister } from '../hooks/useAuth';
import type { AuthUser } from '../hooks/useAuth';

export interface RegisterFormValues {
  email: string;
  password: string;
  confirm: string;
}

export interface RegisterFormState {
  values: RegisterFormValues;
  errors: Partial<RegisterFormValues>;
  serverError: string | null;
  loading: boolean;
}

export function validateRegister(values: RegisterFormValues): Partial<RegisterFormValues> {
  const errors: Partial<RegisterFormValues> = {};
  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(values.password) || !/[0-9]/.test(values.password)) {
    errors.password = 'Include an uppercase letter and a number';
  }
  if (values.confirm !== values.password) {
    errors.confirm = 'Passwords do not match';
  }
  return errors;
}

interface Props {
  onSuccess?: (user: AuthUser) => void;
}

export default function RegisterForm({ onSuccess }: Props): ReactNode {
  const [values, setValues] = useState<RegisterFormValues>({
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<Partial<RegisterFormValues>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const validationErrors = validateRegister(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setServerError(null);
    try {
      const result = await performRegister(values.email.trim(), values.password);
      if (result.ok && result.user) {
        onSuccess?.(result.user);
      } else {
        setServerError(result.message ?? 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="rounded-xl border border-white/8 bg-space-850/60 p-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-white/55">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-gold-300 transition hover:text-gold-400"
          >
            Sign in
          </Link>
        </div>

        <h2 className="font-display text-2xl text-white">Create a customer account</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Public registration creates a <strong className="text-gold-300">customer</strong>{' '}
          account. Astrologer and admin accounts require an approval or provisioning workflow.
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-space-850/60 p-6 space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-nebula-500/10 p-3 ring-1 ring-nebula-400/30">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
          <div className="text-xs leading-relaxed text-white/55">
            <strong>Customer default.</strong> You&apos;ll be able to browse astrologers and book
            consultations once Phase 1 features ship.
          </div>
        </div>

        <label className="block text-sm text-white/70">
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
            <p className="mt-1 text-xs text-rose-300" id="register-email-error">
              {errors.email}
            </p>
          )}
        </label>

        <label className="block text-sm text-white/70">
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
              placeholder="At least 8 characters"
              className="peer w-full rounded-lg border border-white/10 bg-space-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 transition focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              autoComplete="new-password"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-300" id="register-password-error">
              {errors.password}
            </p>
          )}
        </label>

        <label className="block text-sm text-white/70">
          Confirm password
          <div className="mt-1 relative">
            <User
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="password"
              name="confirm"
              value={values.confirm}
              onChange={handleChange}
              placeholder="Repeat password"
              className="peer w-full rounded-lg border border-white/10 bg-space-900/60 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 transition focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              autoComplete="new-password"
            />
          </div>
          {errors.confirm && (
            <p className="mt-1 text-xs text-rose-300" id="register-confirm-error">
              {errors.confirm}
            </p>
          )}
        </label>

        {serverError && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
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
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </div>

      <p className="text-center text-xs text-white/40">
        Passwords are hashed with bcrypt. We never store them in plain text.
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