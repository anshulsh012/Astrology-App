import { greetingName } from '../../lib/greeting'
import type { AuthUser } from '../../types/auth'

export function WelcomeHeader({ user }: { user: AuthUser }) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Your space</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-cream sm:text-5xl">
        Namaste, {greetingName(user.email)}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-lavender">
        A quieter place to find counsel. Browse astrologers when you are ready; bookings and saved
        guides will live here when they open.
      </p>
    </header>
  )
}
