import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Sparkles,
  Star,
  Video,
  MessageCircle,
  Phone,
  RotateCcw,
} from 'lucide-react';
import Layout from '../components/Layout';
import {
  describeApiError,
  fetchPublicAstrologers,
  type PublicAstrologer,
  type PublicAstrologerPage,
} from '../lib/astrologerApi';

const SORT_OPTIONS = [
  { value: 'experience_desc', label: 'Most experienced' },
  { value: 'experience_asc', label: 'Least experienced' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const MODE_OPTIONS = [
  { value: '', label: 'Any mode' },
  { value: 'chat', label: 'Chat' },
  { value: 'audio', label: 'Audio call' },
  { value: 'video', label: 'Video call' },
];

const PAGE_SIZE = 12;

const MODE_ICONS: Record<string, typeof MessageCircle> = {
  chat: MessageCircle,
  audio: Phone,
  video: Video,
};

function AstrologerCard({ astrologer }: { astrologer: PublicAstrologer }): ReactNode {
  return (
    <article
      className="flex flex-col rounded-2xl border border-white/8 bg-space-850/60 p-6"
      aria-label={`Astrologer ${astrologer.display_name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg text-white">{astrologer.display_name}</h3>
        {astrologer.min_rate_per_minute && (
          <span className="whitespace-nowrap rounded-full bg-gold-400/10 px-2.5 py-1 text-xs font-medium text-gold-300">
            ₹{astrologer.min_rate_per_minute}/min
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-white/50">
        {astrologer.years_experience} years experience
      </p>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/60">{astrologer.bio}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {astrologer.specialties.map((specialty) => (
          <span
            key={specialty}
            className="rounded-full bg-nebula-500/15 px-2.5 py-0.5 text-xs text-nebula-300 ring-1 ring-nebula-400/30"
          >
            {specialty}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {astrologer.languages.map((language) => (
          <span
            key={language}
            className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60"
          >
            {language}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-4 text-xs text-white/50">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
          Verified
        </span>
        {astrologer.consultation_modes.map((mode) => {
          const Icon = MODE_ICONS[mode] ?? MessageCircle;
          return (
            <span key={mode} className="inline-flex items-center gap-1 capitalize">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {mode}
            </span>
          );
        })}
      </div>

      {/* Consultation booking ships in a later phase; discovery only for now. */}
      <p className="mt-4 text-xs text-white/40">
        Booking opens in a later phase — consultations are not live yet.
      </p>
    </article>
  );
}

export default function CustomerEntry(): ReactNode {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [language, setLanguage] = useState('');
  const [mode, setMode] = useState('');
  const [sort, setSort] = useState('experience_desc');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PublicAstrologerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPublicAstrologers({
        q: query.trim() || undefined,
        specialty: specialty.trim() || undefined,
        language: language.trim() || undefined,
        mode: mode || undefined,
        sort,
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [query, specialty, language, mode, sort, page]);

  useEffect(() => {
    void load();
  }, [load, attempt]);

  const handleSearch = (event: FormEvent): void => {
    event.preventDefault();
    setPage(1); // new filters restart at page 1; state change re-triggers load
    setAttempt((value) => value + 1);
  };

  const handleReset = (): void => {
    setQuery('');
    setSpecialty('');
    setLanguage('');
    setMode('');
    setSort('experience_desc');
    setPage(1);
    setAttempt((value) => value + 1);
  };

  // Tolerate an unexpected payload shape (e.g. a mocked health response):
  // render the empty state rather than crashing on `undefined.length`.
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === 'number' ? data.total : items.length;
  const totalPages = typeof data?.total_pages === 'number' ? data.total_pages : 1;

  return (
    <Layout>
      <section className="cosmic-bg min-h-[70vh] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.3em] text-gold-400/90">Customer area</p>
          <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">
            Consult an astrologer
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
            Browse verified astrologers by specialty, language and consultation mode. Every
            profile here has been reviewed and approved by the admin team.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 grid gap-3 rounded-2xl border border-white/8 bg-space-850/60 p-5 sm:grid-cols-2 lg:grid-cols-5"
            aria-label="Search astrologers"
          >
            <label className="block text-xs text-white/55">
              Name
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name"
                className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              />
            </label>
            <label className="block text-xs text-white/55">
              Specialty
              <input
                type="text"
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                placeholder="e.g. Kundli"
                className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              />
            </label>
            <label className="block text-xs text-white/55">
              Language
              <input
                type="text"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                placeholder="e.g. Hindi"
                className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              />
            </label>
            <label className="block text-xs text-white/55">
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-white/55">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-space-900/60 px-3 py-2 text-sm text-white focus:border-gold-400/60 focus:outline-none focus:ring-1 focus:ring-gold-400/50"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-5 py-2 text-sm font-medium text-space-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-gold-400/60 disabled:opacity-50"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:border-gold-400/50 hover:text-gold-300"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </button>
            </div>
          </form>

          <div aria-live="polite" className="mt-8">
            {loading && (
              <div
                className="flex flex-col items-center gap-3 py-16"
                data-testid="discovery-loading"
              >
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-nebula-400 border-t-transparent" />
                <p className="text-sm text-white/60">Finding astrologers for you…</p>
              </div>
            )}

            {!loading && error && (
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-6 py-12 text-center"
                data-testid="discovery-error"
              >
                <p className="text-sm text-rose-300">{error}</p>
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="rounded-full border border-rose-300/40 px-5 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && data && items.length === 0 && (
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-space-850/60 px-6 py-12 text-center"
                data-testid="discovery-empty"
              >
                <Sparkles className="h-6 w-6 text-gold-400" aria-hidden="true" />
                <p className="text-sm text-white/60">
                  No approved astrologers match your search yet. Try different filters.
                </p>
              </div>
            )}

            {!loading && !error && data && items.length > 0 && (
              <>
                <p className="mb-4 text-sm text-white/50">
                  {total} astrologer{total === 1 ? '' : 's'} found
                </p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((astrologer) => (
                    <AstrologerCard key={astrologer.id} astrologer={astrologer} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="mt-8 flex items-center justify-center gap-4"
                    aria-label="Pagination"
                  >
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={!data.has_prev || loading}
                      className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:border-gold-400/50 hover:text-gold-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-white/50">
                      Page {data.page ?? 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((value) => value + 1)}
                      disabled={!data.has_next || loading}
                      className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:border-gold-400/50 hover:text-gold-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>

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
