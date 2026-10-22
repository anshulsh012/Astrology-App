import { useAuth } from '../auth/useAuth'
import { DashboardNavCards } from '../components/customer/DashboardNavCards'
import { DiscoveryPanel } from '../components/customer/DiscoveryPanel'
import { UpcomingBookings } from '../components/customer/UpcomingBookings'
import { WelcomeHeader } from '../components/customer/WelcomeHeader'

export function CustomerDashboardPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <WelcomeHeader user={user} />
      <div className="mt-8">
        <DiscoveryPanel />
      </div>
      <div className="mt-8">
        <DashboardNavCards />
      </div>
      <div className="mt-8">
        <UpcomingBookings />
      </div>
    </div>
  )
}
