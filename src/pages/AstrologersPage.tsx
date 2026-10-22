import { Search } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AstrologerCard } from '../components/astrologers/AstrologerCard'
import { AstrologerCardSkeleton } from '../components/astrologers/AstrologerCardSkeleton'
import { Button } from '../components/ui/Button'
import {
  listAstrologers,
  parseSort,
  parseSpecialty,
  sortOptions,
  specialtyOptions,
} from '../services/astrologers'
import type { Astrologer, AstrologerQuery } from '../types/astrologer'

type DirectoryState =
  | { status: 'loading' }
  | { status: 'ready'; items: Astrologer[]; total: number }
  | { status: 'error'; message: string }

export function AstrologersPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const specialty = parseSpecialty(params.get('specialty'))
  const sort = parseSort(params.get('sort'))
  const [draft, setDraft] = useState(query)
  const [state, setState] = useState<DirectoryState>({ status: 'loading' })

  const filters: AstrologerQuery = useMemo(
    () => ({ q: query, specialty, sort }),
    [query, specialty, sort],
  )

  useEffect(() => {
    let cancelled = false

    listAstrologers(filters)
      .then((result) => {
        if (cancelled) return
        setState({ status: 'ready', items: result.items, total: result.total })
      })
      .catch(() => {
        if (cancelled) return
        setState({
          status: 'error',
          message: 'The sample directory could not be loaded. Try again in a moment.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  function updateParams(next: { q?: string; specialty?: string; sort?: string }) {
    const merged = new URLSearchParams(params)
    if (next.q !== undefined) {
      if (next.q) merged.set('q', next.q)
      else merged.delete('q')
    }
    if (next.specialty !== undefined) {
      if (next.specialty && next.specialty !== 'all') merged.set('specialty', next.specialty)
      else merged.delete('specialty')
    }
    if (next.sort !== undefined) {
      if (next.sort && next.sort !== 'featured') merged.set('sort', next.sort)
      else merged.delete('sort')
    }
    setParams(merged)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateParams({ q: draft.trim() })
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Directory</p>
      <h1 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">Astrologers</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-lavender">
        Browse sample profiles by name, language or specialty. Listings, rates and scores are
        placeholders until a live catalogue is connected.
      </p>

      <form
        onSubmit={handleSearch}
        className="mt-8 rounded-2xl border border-line bg-card p-4 sm:p-5"
        role="search"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lavender-muted"
              aria-hidden="true"
            />
            <input
              key={query}
              type="search"
              defaultValue={query}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search name, language or specialty"
              aria-label="Search astrologers"
              className="h-11 w-full rounded-full border border-line bg-plum/80 py-2.5 pl-11 pr-4 text-sm text-cream"
            />
          </div>
          <label className="block">
            <span className="sr-only">Specialty</span>
            <select
              value={specialty}
              onChange={(event) => updateParams({ specialty: event.target.value })}
              className="h-11 w-full rounded-full border border-line bg-plum/80 px-4 text-sm text-cream"
            >
              {specialtyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="h-11 w-full rounded-full border border-line bg-plum/80 px-4 text-sm text-cream"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="h-11">
            Search
          </Button>
        </div>
      </form>

      <p className="mt-6 text-sm text-lavender-muted" aria-live="polite">
        {state.status === 'loading'
          ? 'Loading sample profiles…'
          : state.status === 'error'
            ? state.message
            : `${state.total} sample ${state.total === 1 ? 'profile' : 'profiles'}`}
      </p>

      {state.status === 'error' ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-6">
          <p className="text-cream">Unable to load the directory.</p>
          <p className="mt-2 text-sm text-lavender">{state.message}</p>
          <Button
            className="mt-4"
            onClick={() => updateParams({ q: query })}
            variant="gold-outline"
          >
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === 'loading' ? (
        <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2">
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
          <AstrologerCardSkeleton />
        </div>
      ) : null}

      {state.status === 'ready' && state.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-card p-8 text-center">
          <h2 className="font-serif text-2xl text-cream">No sample profiles match</h2>
          <p className="mt-2 text-sm text-lavender">
            Try another name, language or specialty. The live catalogue is not connected yet.
          </p>
          <Button
            className="mt-5"
            variant="gold-outline"
            onClick={() => {
              setDraft('')
              setParams(new URLSearchParams())
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}

      {state.status === 'ready' && state.items.length > 0 ? (
        <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2">
          {state.items.map((astrologer) => (
            <AstrologerCard key={astrologer.id} astrologer={astrologer} />
          ))}
        </div>
      ) : null}

    </section>
  )
}
