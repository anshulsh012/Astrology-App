import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { IncomingRequests } from '../components/astrologer/IncomingRequests'
import { Button } from '../components/ui/Button'
import { roleArea } from '../services/auth'
import type { AuthRole } from '../types/auth'

const copy: Record<
  AuthRole,
  { title: string; description: string; next: string }
> = {
  customer: {
    title: 'Customer area',
    description:
      'Your account is signed in. Booking and consultation tools are not part of this milestone.',
    next: 'Browse sample astrologers while the customer dashboard is prepared.',
  },
  astrologer: {
    title: 'Astrologer area',
    description:
      'This route is reserved for astrologer accounts. Consultation requests can be accepted or rejected from your bookings queue.',
    next: 'Open consultation requests, return to the directory, or sign out when you are finished.',
  },
  admin: {
    title: 'Admin area',
    description:
      'This route is reserved for administrators. Review tools are not implemented in this milestone.',
    next: 'Use this page only as a session-aware landing area.',
  },
}

type AccountAreaPageProps = {
  role: AuthRole
}

export function AccountAreaPage({ role }: AccountAreaPageProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const content = copy[role]

  return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
        Signed in
      </p>
      <h1 className="mt-3 font-serif text-4xl text-cream">{content.title}</h1>
      <p className="mt-3 text-base leading-relaxed text-lavender">{content.description}</p>
      <dl className="mt-8 space-y-3 rounded-2xl border border-line bg-card p-6 text-sm">
        <div>
          <dt className="text-lavender-muted">Email</dt>
          <dd className="mt-1 text-cream">{user?.email}</dd>
        </div>
        <div>
          <dt className="text-lavender-muted">Role</dt>
          <dd className="mt-1 capitalize text-cream">{user?.role}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-lavender">{content.next}</p>
      {role === 'astrologer' ? <IncomingRequests /> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        {role === 'astrologer' ? <Button to="/astrologer/bookings">Consultation requests</Button> : null}
        <Button to={role === 'customer' ? '/astrologers' : roleArea(role)} variant="gold-outline">
          {role === 'customer' ? 'Browse astrologers' : 'Stay in this area'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            navigate('/', { replace: true })
            void signOut()
          }}
        >
          Log out
        </Button>
      </div>
    </section>
  )
}
