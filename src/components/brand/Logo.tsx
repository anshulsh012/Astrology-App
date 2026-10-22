import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type LogoProps = {
  className?: string
  compact?: boolean
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-sm text-cream', className)}
      aria-label="Nakshtra home"
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-full border border-gold/40 bg-plum">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
          <path
            d="M20.5 9.2c-1.6 2.4-1.7 5.6.1 8.1 1.5 2.1 1.2 4.3-.4 5.5 3.8-1 6.5-4.6 6.5-8.7 0-3.2-1.7-6-4.2-7.5-.4 1-.9 1.8-2 2.6z"
            fill="#d4af37"
          />
          <path
            d="M11 8.5l.7 2.1 2.2.1-1.7 1.4.6 2.1L11 12.9l-1.8 1.3.6-2.1-1.7-1.4 2.2-.1z"
            fill="#f4ead8"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-serif text-xl tracking-wide text-cream group-hover:text-gold-soft">
          Nakshtra
        </span>
        {compact ? null : (
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-lavender-muted">
            Astrology counsel
          </span>
        )}
      </span>
    </Link>
  )
}
