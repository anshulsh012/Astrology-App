import { Bookmark, CalendarDays, Clock3, UserRound, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type NavCard = {
  to: string
  title: string
  description: string
  icon: LucideIcon
  status?: string
}

const cards: NavCard[] = [
  {
    to: '/customer/bookings',
    title: 'My Bookings',
    description: 'Review pending requests and confirmed sessions, or cancel when policy allows.',
    icon: CalendarDays,
  },
  {
    to: '/customer/saved',
    title: 'Saved Astrologers',
    description: 'A private list of astrologers you want to return to is not available yet.',
    icon: Bookmark,
    status: 'Coming soon',
  },
  {
    to: '/customer/history',
    title: 'Consultation History',
    description: 'Past conversations will be recorded here after live consultations exist.',
    icon: Clock3,
    status: 'Coming soon',
  },
  {
    to: '/customer/profile',
    title: 'My Profile',
    description: 'Review the email and role on this account. Profile editing is not connected yet.',
    icon: UserRound,
  },
]

export function DashboardNavCards() {
  return (
    <nav aria-label="Customer dashboard">
      <ul className="grid items-stretch gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <li key={card.to} className="h-full">
              <Link
                to={card.to}
                className="group flex h-full min-h-[10.5rem] flex-col rounded-2xl border border-line bg-card p-5 transition-colors hover:border-gold/40"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  {card.status ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                      {card.status}
                    </span>
                  ) : null}
                </span>
                <h2 className="mt-4 font-serif text-2xl text-cream group-hover:text-gold-soft">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-lavender">{card.description}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
