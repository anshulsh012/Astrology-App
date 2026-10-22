import { Clock, Languages } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { getAstrologerById } from '../services/astrologers'
import type { Astrologer } from '../types/astrologer'

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; astrologer: Astrologer }
  | { status: 'missing' }
  | { status: 'error' }

export function AstrologerProfilePage() {
  const { id } = useParams()
  const [state, setState] = useState<ProfileState>(() =>
    id ? { status: 'loading' } : { status: 'missing' },
  )

  useEffect(() => {
    let cancelled = false
    if (!id) {
      return
    }

    getAstrologerById(id)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setState({ status: 'missing' })
          return
        }
        setState({ status: 'ready', astrologer: result })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [id])

  if (state.status === 'loading') {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8" aria-busy="true">
        <p className="text-sm text-lavender">Loading sample profile…</p>
        <div className="mt-6 h-24 w-24 animate-pulse rounded-2xl bg-plum" />
        <div className="mt-6 h-10 w-64 animate-pulse rounded bg-plum" />
        <div className="mt-4 h-20 max-w-xl animate-pulse rounded bg-plum" />
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-cream">Profile unavailable</h1>
        <p className="mt-3 text-lavender">
          The sample profile could not be loaded. Nothing was booked and no account was used.
        </p>
        <Button to="/astrologers" className="mt-6">
          Return to directory
        </Button>
      </section>
    )
  }

  if (state.status === 'missing') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-cream">Sample profile not found</h1>
        <p className="mt-3 text-lavender">
          That identifier is not in the current sample set. Browse the directory to continue.
        </p>
        <Button to="/astrologers" className="mt-6">
          Browse astrologers
        </Button>
      </section>
    )
  }

  const { astrologer } = state

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Sample profile</p>
      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line"
          style={{
            background: `linear-gradient(160deg, ${astrologer.portrait.from}, ${astrologer.portrait.to})`,
          }}
          aria-hidden="true"
        >
          <span className="absolute inset-0 grid place-items-center font-serif text-3xl text-cream">
            {astrologer.portrait.initials}
          </span>
        </div>
        <div>
          <h1 className="font-serif text-4xl text-cream sm:text-5xl">{astrologer.name}</h1>
          <p className="mt-2 text-lg text-lavender">{astrologer.title}</p>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-base leading-relaxed text-mist">{astrologer.bio}</p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-lavender">{astrologer.approach}</p>

      <ul className="mt-6 flex flex-wrap gap-1.5">
        {astrologer.specialties.map((item) => (
          <li
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-mist"
          >
            {item}
          </li>
        ))}
      </ul>

      <dl className="mt-8 grid gap-3 text-sm text-lavender sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <dt className="flex items-center gap-2 text-gold">
            <Languages size={16} aria-hidden="true" /> Languages
          </dt>
          <dd className="mt-2 text-cream">{astrologer.languages.join(', ')}</dd>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <dt className="flex items-center gap-2 text-gold">
            <Clock size={16} aria-hidden="true" /> Experience
          </dt>
          <dd className="mt-2 text-cream">{astrologer.experienceYears} years</dd>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <dt className="text-gold">Indicative rate</dt>
          <dd className="mt-2 font-serif text-2xl text-gold-soft">
            ₹{astrologer.pricePerMinute}
            <span className="ml-1 font-sans text-sm text-lavender-muted">/ min</span>
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-xs text-lavender-muted">{astrologer.sampleNote}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/customer/book">Book an approved astrologer</Button>
        <Button to="/astrologers" variant="gold-outline">
          Back to directory
        </Button>
      </div>
      <p className="mt-4 text-sm text-lavender-muted">
        This sample profile cannot be booked. Live requests use approved numeric profiles, not
        sample ids like {astrologer.id}. Chat, video, and payments are still not included.
      </p>
    </section>
  )
}
