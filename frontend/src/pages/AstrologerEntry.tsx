import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock, Send, Save, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import {
  createOwnProfile,
  describeApiError,
  fetchOwnProfile,
  submitOwnProfile,
  updateOwnProfile,
  type AstrologerProfile,
} from '../lib/astrologerApi';

interface FormState {
  display_name: string;
  bio: string;
  years_experience: string;
  languages: string;
  specialties: string;
  chat_enabled: boolean;
  chat_rate: string;
  audio_enabled: boolean;
  audio_rate: string;
  video_enabled: boolean;
  video_rate: string;
}

const EMPTY_FORM: FormState = {
  display_name: '',
  bio: '',
  years_experience: '0',
  languages: '',
  specialties: '',
  chat_enabled: false,
  chat_rate: '',
  audio_enabled: false,
  audio_rate: '',
  video_enabled: false,
  video_rate: '',
};

function toFormState(profile: AstrologerProfile): FormState {
  return {
    display_name: profile.display_name,
    bio: profile.bio,
    years_experience: String(profile.years_experience),
    languages: profile.languages.join(', '),
    specialties: profile.specialties.join(', '),
    chat_enabled: profile.chat_enabled,
    chat_rate: profile.chat_rate ?? '',
    audio_enabled: profile.audio_enabled,
    audio_rate: profile.audio_rate ?? '',
    video_enabled: profile.video_enabled,
    video_rate: profile.video_rate ?? '',
  };
}

/** Split a comma-separated list into trimmed, non-empty entries. */
function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Client-side mirror of the backend validation (server stays authoritative). */
export function validateProfileForm(form: FormState): Record<string, string | undefined> {
  const errors: Record<string, string> = {};
  if (form.display_name.trim().length < 2) {
    errors.display_name = 'Display name must be at least 2 characters';
  }
  if (form.bio.trim().length < 20) {
    errors.bio = 'Bio must be at least 20 characters';
  }
  const years = Number(form.years_experience);
  if (!Number.isInteger(years) || years < 0 || years > 80) {
    errors.years_experience = 'Years of experience must be a whole number between 0 and 80';
  }
  if (splitList(form.languages).length === 0) {
    errors.languages = 'Add at least one language';
  }
  if (splitList(form.specialties).length === 0) {
    errors.specialties = 'Add at least one specialty';
  }
  const modes: Array<[string, boolean, string]> = [
    ['chat', form.chat_enabled, form.chat_rate],
    ['audio', form.audio_enabled, form.audio_rate],
    ['video', form.video_enabled, form.video_rate],
  ];
  for (const [mode, enabled, rate] of modes) {
    if (enabled && (!rate || Number(rate) <= 0)) {
      errors[`${mode}_rate`] = `Enter a rate greater than 0 for ${mode}`;
    }
  }
  return errors;
}

function buildPayload(form: FormState) {
  const rate = (enabled: boolean, value: string): string | null =>
    enabled && value ? value : null;
  return {
    display_name: form.display_name.trim(),
    bio: form.bio.trim(),
    years_experience: Number(form.years_experience),
    languages: splitList(form.languages),
    specialties: splitList(form.specialties),
    chat_enabled: form.chat_enabled,
    chat_rate: rate(form.chat_enabled, form.chat_rate),
    audio_enabled: form.audio_enabled,
    audio_rate: rate(form.audio_enabled, form.audio_rate),
    video_enabled: form.video_enabled,
    video_rate: rate(form.video_enabled, form.video_rate),
  };
}

const STATUS_PRESENTATION: Record<
  AstrologerProfile['approval_status'],
  { label: string; className: string; icon: typeof Clock }
> = {
  draft: {
    label: 'Draft — not submitted for review yet',
    className: 'border-white/15 bg-white/5 text-white/70',
    icon: Clock,
  },
  pending: {
    label: 'Pending review — the admin team will look at your profile soon',
    className: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
    icon: Clock,
  },
  approved: {
    label: 'Approved — your profile is live in public discovery',
    className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Changes requested — update your profile and resubmit',
    className: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    icon: XCircle,
  },
};

export default function AstrologerEntry(): ReactNode {
  const [profile, setProfile] = useState<AstrologerProfile | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setLoadError(null);
    fetchOwnProfile()
      .then((result) => {
        if (cancelled) return;
        setProfile(result);
        setForm(result ? toFormState(result) : EMPTY_FORM);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(describeApiError(err));
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const { name, value, type } = event.target;
      const checked = (event.target as HTMLInputElement).checked;
      setForm((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
      setSaveError(null);
      setNotice(null);
    },
    [],
  );

  const handleSave = useCallback(
    async (event: FormEvent): Promise<void> => {
      event.preventDefault();
      const errors = validateProfileForm(form);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setSaving(true);
      setSaveError(null);
      setNotice(null);
      try {
        const payload = buildPayload(form);
        const saved = profile
          ? await updateOwnProfile(payload)
          : await createOwnProfile(payload);
        setProfile(saved);
        setForm(toFormState(saved));
        setNotice(
          profile
            ? 'Profile saved.'
            : 'Profile created as a draft. Submit it for review when you are ready.',
        );
      } catch (err) {
        setSaveError(describeApiError(err));
      } finally {
        setSaving(false);
      }
    },
    [form, profile],
  );

  const handleSubmitForReview = useCallback(async (): Promise<void> => {
    setSubmitting(true);
    setSaveError(null);
    setNotice(null);
    try {
      const result = await submitOwnProfile();
      setProfile(result);
      setNotice('Your profile has been submitted for admin review.');
    } catch (err) {
      setSaveError(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }, []);

  if (loadState === 'loading') {
    return (
      <Layout>
        <section
          className="cosmic-bg flex min-h-[70vh] flex-col items-center justify-center gap-3"
          data-testid="dashboard-loading"
        >
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-nebula-400 border-t-transparent" />
          <p className="text-sm text-white/60">Loading your profile…</p>
        </section>
      </Layout>
    );
  }

  if (loadState === 'error') {
    return (
      <Layout>
        <section className="cosmic-bg flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-rose-300" data-testid="dashboard-error">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-5 py-2 text-sm font-medium text-space-950 transition hover:brightness-110"
          >
            Try again
          </button>
        </section>
      </Layout>
    );
  }

  const status = profile?.approval_status;
  const presentation = status ? STATUS_PRESENTATION[status] : null;
  const StatusIcon = presentation?.icon;
  // Pending and approved profiles cannot be edited — only draft/rejected can.
  const editable = !profile || status === 'draft' || status === 'rejected';
  const canSubmit = profile !== null && (status === 'draft' || status === 'rejected');

  return (
    <Layout>
      <section className="cosmic-bg min-h-[70vh] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Astrologer area</p>
          <h1 className="mt-3 font-display text-4xl text-white">Your profile</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Keep your profile up to date, then submit it for review. Approved profiles appear in
            public customer discovery.
          </p>

          {presentation && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${presentation.className}`}
              data-testid="status-banner"
              role="status"
            >
              {StatusIcon && <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              <div>
                <p>{presentation.label}</p>
                {status === 'rejected' && profile?.rejection_reason && (
                  <p className="mt-1 text-xs opacity-90">
                    Admin feedback: {profile.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {!editable && (
            <p className="mt-4 text-xs text-white/50">
              Profiles awaiting review or already approved cannot be edited here. Contact the
              admin team if you need changes.
            </p>
          )}

          <form onSubmit={handleSave} className="mt-8 space-y-5" noValidate>
            <div className="rounded-xl border border-white/8 bg-space-850/60 p-6">
              <label className="block text-sm text-white/70">
                Display name
                <input
                  type="text"
                  name="display_name"
                  value={form.display_name}
                  onChange={handleChange}
                  disabled={!editable}
                  maxLength={120}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50 disabled:opacity-60"
                  placeholder="How customers will see you"
                />
                {fieldErrors.display_name && (
                  <p className="mt-1 text-xs text-rose-300">{fieldErrors.display_name}</p>
                )}
              </label>

              <label className="mt-4 block text-sm text-white/70">
                Bio
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  disabled={!editable}
                  rows={4}
                  maxLength={4000}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50 disabled:opacity-60"
                  placeholder="Your experience, approach and what clients can expect (min 20 characters)"
                />
                {fieldErrors.bio && <p className="mt-1 text-xs text-rose-300">{fieldErrors.bio}</p>}
              </label>

              <label className="mt-4 block text-sm text-white/70">
                Years of experience
                <input
                  type="number"
                  name="years_experience"
                  value={form.years_experience}
                  onChange={handleChange}
                  disabled={!editable}
                  min={0}
                  max={80}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2.5 text-sm text-white focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50 disabled:opacity-60"
                />
                {fieldErrors.years_experience && (
                  <p className="mt-1 text-xs text-rose-300">{fieldErrors.years_experience}</p>
                )}
              </label>

              <label className="mt-4 block text-sm text-white/70">
                Languages <span className="text-white/40">(comma separated)</span>
                <input
                  type="text"
                  name="languages"
                  value={form.languages}
                  onChange={handleChange}
                  disabled={!editable}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50 disabled:opacity-60"
                  placeholder="Hindi, English"
                />
                {fieldErrors.languages && (
                  <p className="mt-1 text-xs text-rose-300">{fieldErrors.languages}</p>
                )}
              </label>

              <label className="mt-4 block text-sm text-white/70">
                Specialties <span className="text-white/40">(comma separated)</span>
                <input
                  type="text"
                  name="specialties"
                  value={form.specialties}
                  onChange={handleChange}
                  disabled={!editable}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50 disabled:opacity-60"
                  placeholder="Kundli, Vedic, Tarot"
                />
                {fieldErrors.specialties && (
                  <p className="mt-1 text-xs text-rose-300">{fieldErrors.specialties}</p>
                )}
              </label>
            </div>

            <fieldset
              className="rounded-xl border border-white/8 bg-space-850/60 p-6"
              disabled={!editable}
            >
              <legend className="px-1 text-sm text-white/70">Consultation modes & rates</legend>
              <p className="text-xs text-white/45">Per-minute rates in ₹; enable at least one.</p>
              {(
                [
                  ['chat', 'Chat'],
                  ['audio', 'Audio call'],
                  ['video', 'Video call'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="mt-4 flex items-end gap-3">
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      name={`${key}_enabled`}
                      checked={form[`${key}_enabled`]}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-white/20 bg-space-900/60 accent-gold-400"
                    />
                    {label}
                  </label>
                  {form[`${key}_enabled`] && (
                    <label className="ml-auto block text-xs text-white/55">
                      Rate (₹/min)
                      <input
                        type="number"
                        name={`${key}_rate`}
                        value={form[`${key}_rate`]}
                        onChange={handleChange}
                        min="0.01"
                        step="0.01"
                        className="ml-2 w-28 rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
                      />
                      {fieldErrors[`${key}_rate`] && (
                        <p className="mt-1 text-xs text-rose-300">{fieldErrors[`${key}_rate`]}</p>
                      )}
                    </label>
                  )}
                </div>
              ))}
            </fieldset>

            {saveError && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300" role="alert">
                {saveError}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" role="status">
                {notice}
              </p>
            )}

            {editable && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-6 py-2.5 text-sm font-medium text-space-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-gold-400/60 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-space-950 border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {profile ? 'Save changes' : 'Create profile'}
                  </>
                )}
              </button>
            )}
          </form>

          {canSubmit && (
            <div className="mt-6 rounded-xl border border-white/8 bg-space-850/60 p-6">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <BadgeCheck className="h-4 w-4 text-gold-300" aria-hidden="true" />
                Ready for review?
              </div>
              <p className="mt-1 text-xs text-white/50">
                An admin will review your profile. You can still edit it until then.
              </p>
              <button
                type="button"
                onClick={() => void handleSubmitForReview()}
                disabled={submitting}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold-400/60 bg-gold-400/10 px-5 py-2 text-sm font-medium text-gold-300 transition hover:bg-gold-400/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold-300 border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Submit for review
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-gold-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
