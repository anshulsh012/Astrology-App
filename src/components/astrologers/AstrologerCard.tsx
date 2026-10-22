import { Clock, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Astrologer } from '../../types/astrologer'
import { Button } from '../ui/Button'

type AstrologerCardProps = {
  astrologer: Astrologer
}

function Portrait({ astrologer }: { astrologer: Astrologer }) {
  return (
    <div
      className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl border border-line sm:h-20 sm:w-20"
      style={{
        background: `linear-gradient(160deg, ${astrologer.portrait.from}, ${astrologer.portrait.to})`,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full opacity-40">
        <circle cx="40" cy="28" r="12" fill="none" stroke={astrologer.portrait.accent} strokeWidth="1" />
        <path
          d="M18 70c4-16 14-24 22-24s18 8 22 24"
          fill="none"
          stroke={astrologer.portrait.accent}
          strokeWidth="1"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-serif text-2xl text-cream">
        {astrologer.portrait.initials}
      </span>
    </div>
  )
}

export function AstrologerCard({ astrologer }: AstrologerCardProps) {
  const profileTo = `/astrologers/${astrologer.id}`

  return (
    <article className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-line bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:border-gold/35">
      <div className="flex gap-4">
        <Portrait astrologer={astrologer} />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
            Sample profile
          </p>
          <h3 className="mt-1 font-serif text-2xl leading-tight text-cream">
            <Link to={profileTo} className="hover:text-gold-soft">
              {astrologer.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-lavender">{astrologer.title}</p>
        </div>
      </div>

      <ul className="mt-4 flex min-h-[2rem] flex-wrap gap-1.5">
        {astrologer.specialties.map((item) => (
          <li
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-mist"
          >
            {item}
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-2 text-sm text-lavender">
        <div className="flex items-start gap-2">
          <Languages size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
          <dt className="sr-only">Languages</dt>
          <dd>{astrologer.languages.join(', ')}</dd>
        </div>
        <div className="flex items-start gap-2">
          <Clock size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
          <dt className="sr-only">Experience</dt>
          <dd>{astrologer.experienceYears} years of practice</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-lavender-muted">{astrologer.sampleNote}</p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p>
          <span className="font-serif text-2xl text-gold-soft">₹{astrologer.pricePerMinute}</span>
          <span className="ml-1 text-xs text-lavender-muted">/ min, indicative</span>
        </p>
        <Button to={profileTo} variant="gold-outline" size="sm">
          View profile
        </Button>
      </div>
    </article>
  )
}
