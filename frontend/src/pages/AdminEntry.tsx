import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import Layout from '../components/Layout';
import {
  approveApplication,
  describeApiError,
  fetchApplications,
  rejectApplication,
  type AdminApplication,
  type ApplicationPage,
} from '../lib/astrologerApi';

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' },
  { value: 'all', label: 'All' },
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-white/15 bg-white/5 text-white/70',
  pending: 'border-sky-400/30 bg-sky-500/10 text-sky-300',
  approved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
};

const PAGE_SIZE = 20;
const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 2000;

function ApplicationRow({
  application,
  onAction,
  busy,
  error,
}: {
  application: AdminApplication;
  onAction: (application: AdminApplication, action: 'approve' | 'reject', reason?: string) => void;
  busy: boolean;
  error: string | null;
}): ReactNode {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const startReject = (): void => {
    setRejecting(true);
    setReasonError(null);
  };

  const cancelReject = (): void => {
    setRejecting(false);
    setReason('');
    setReasonError(null);
  };

  const confirmReject = (): void => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setReasonError(`Give a reason of at least ${MIN_REASON_LENGTH} characters`);
      return;
    }
    onAction(application, 'reject', trimmed);
    setRejecting(false);
    setReason('');
  };

  const pending = application.approval_status === 'pending';

  return (
    <li
      className="rounded-xl border border-white/8 bg-space-850/60 p-5"
      aria-label={`Application from ${application.applicant_email}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{application.display_name}</p>
          <p className="mt-0.5 text-xs text-white/50">{application.applicant_email}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${STATUS_STYLES[application.approval_status] ?? STATUS_STYLES.draft}`}
        >
          {application.approval_status}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/60">{application.bio}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
        <span>{application.years_experience} years experience</span>
        <span>Languages: {application.languages.join(', ') || '—'}</span>
        <span>Specialties: {application.specialties.join(', ') || '—'}</span>
        <span>Modes: {application.consultation_modes.join(', ') || '—'}</span>
      </div>

      {application.rejection_reason && (
        <p className="mt-2 text-xs text-rose-300">Previous rejection: {application.rejection_reason}</p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}

      {pending && !rejecting && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onAction(application, 'approve')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={startReject}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-4 py-1.5 text-xs font-medium text-rose-300 ring-1 ring-rose-400/30 transition hover:bg-rose-500/25 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Reject
          </button>
        </div>
      )}

      {pending && rejecting && (
        <div className="mt-4">
          <label className="block text-xs text-white/55">
            Reason for rejection
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              rows={2}
              maxLength={MAX_REASON_LENGTH}
              className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              placeholder="Explain what the applicant should fix…"
            />
          </label>
          {reasonError && <p className="mt-1 text-xs text-rose-300">{reasonError}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmReject}
              disabled={busy}
              className="rounded-full bg-rose-500/20 px-4 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
            >
              Confirm rejection
            </button>
            <button
              type="button"
              onClick={cancelReject}
              disabled={busy}
              className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/60 transition hover:text-white/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function AdminEntry(): ReactNode {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApplicationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<number, string | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchApplications({ status: statusFilter, page, page_size: PAGE_SIZE })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(describeApiError(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, page, attempt]);

  const handleAction = useCallback(
    async (
      application: AdminApplication,
      action: 'approve' | 'reject',
      reason?: string,
    ): Promise<void> => {
      setBusyId(application.id);
      setActionErrors((prev) => ({ ...prev, [application.id]: undefined }));
      try {
        if (action === 'approve') {
          await approveApplication(application.id);
        } else {
          await rejectApplication(application.id, reason ?? '');
        }
        // Refresh the current page so the reviewed item leaves the pending list.
        setAttempt((value) => value + 1);
      } catch (err) {
        setActionErrors((prev) => ({ ...prev, [application.id]: describeApiError(err) }));
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === 'number' ? data.total : items.length;
  const totalPages = typeof data?.total_pages === 'number' ? data.total_pages : 1;

  return (
    <Layout>
      <section className="cosmic-bg min-h-[70vh] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Admin area</p>
          <h1 className="mt-3 font-display text-4xl text-white">Astrologer applications</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Review profiles submitted by astrologers. Approved profiles become publicly visible
            in customer discovery.
          </p>

          <div
            className="mt-6 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter applications by status"
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  statusFilter === filter.value
                    ? 'bg-gold-400/20 text-gold-300 ring-1 ring-gold-400/50'
                    : 'border border-white/15 text-white/60 hover:text-white/90'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div aria-live="polite" className="mt-6">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-16" data-testid="applications-loading">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-nebula-400 border-t-transparent" />
                <p className="text-sm text-white/60">Loading applications…</p>
              </div>
            )}

            {!loading && loadError && (
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-6 py-12 text-center"
                data-testid="applications-error"
              >
                <p className="text-sm text-rose-300">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="rounded-full border border-rose-300/40 px-5 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !loadError && items.length === 0 && (
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-space-850/60 px-6 py-12 text-center"
                data-testid="applications-empty"
              >
                <Users className="h-6 w-6 text-gold-400" aria-hidden="true" />
                <p className="text-sm text-white/60">
                  No {statusFilter === 'all' ? '' : `${statusFilter} `}applications right now.
                </p>
              </div>
            )}

            {!loading && !loadError && items.length > 0 && (
              <>
                <p className="mb-4 text-sm text-white/50">
                  {total} application{total === 1 ? '' : 's'}
                </p>
                <ul className="space-y-4">
                  {items.map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      onAction={(app, action, reason) => void handleAction(app, action, reason)}
                      busy={busyId === application.id}
                      error={actionErrors[application.id] ?? null}
                    />
                  ))}
                </ul>

                {totalPages > 1 && (
                  <nav
                    className="mt-6 flex items-center justify-center gap-4"
                    aria-label="Pagination"
                  >
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={page <= 1 || loading}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition hover:border-gold-400/50 hover:text-gold-300 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      Previous
                    </button>
                    <span className="text-sm text-white/50">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((value) => value + 1)}
                      disabled={page >= totalPages || loading}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 transition hover:border-gold-400/50 hover:text-gold-300 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>

          <div className="mt-10 flex items-center gap-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-gold-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-gold-300 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
