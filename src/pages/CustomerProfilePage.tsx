import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'

function formatJoined(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date)
}

export function CustomerProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Account</p>
      <h1 className="mt-3 font-serif text-4xl text-cream">My Profile</h1>
      <p className="mt-3 text-base leading-relaxed text-lavender">
        These details come from your current session. Name, photo, and profile editing are not
        available yet.
      </p>
      <dl className="mt-8 space-y-4 rounded-2xl border border-line bg-card p-6 text-sm">
        <div>
          <dt className="text-lavender-muted">Email</dt>
          <dd className="mt-1 text-cream">{user.email}</dd>
        </div>
        <div>
          <dt className="text-lavender-muted">Role</dt>
          <dd className="mt-1 capitalize text-cream">{user.role}</dd>
        </div>
        <div>
          <dt className="text-lavender-muted">Member since</dt>
          <dd className="mt-1 text-cream">{formatJoined(user.created_at)}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/customer" variant="gold-outline">
          Back to dashboard
        </Button>
      </div>
    </section>
  )
}
