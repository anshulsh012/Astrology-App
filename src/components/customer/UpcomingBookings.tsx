import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { BookingCard } from '../bookings/BookingCard'
import { upcomingBookings } from '../../lib/bookingUi'
import { bookingErrorMessage, listMyBookings } from '../../services/bookings'
import type { Booking } from '../../types/booking'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: Booking[] }

export function UpcomingBookings() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    listMyBookings()
      .then((page) => {
        if (!cancelled) setState({ status: 'ready', items: upcomingBookings(page.items) })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: bookingErrorMessage(error, 'Upcoming bookings could not be loaded.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section aria-labelledby="upcoming-bookings-heading" className="rounded-2xl border border-line bg-card p-6 sm:p-8">
      <h2 id="upcoming-bookings-heading" className="font-serif text-3xl text-cream">
        Upcoming bookings
      </h2>
      {state.status === 'loading' ? <p className="mt-3 text-sm text-lavender">Loading bookings…</p> : null}
      {state.status === 'error' ? (
        <p role="alert" className="mt-3 text-sm text-gold-soft">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' && state.items.length === 0 ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-lavender sm:text-base">
          No upcoming bookings. Request a consultation with an approved astrologer when you are
          ready. Sample directory profiles cannot be booked.
        </p>
      ) : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {state.items.slice(0, 3).map((booking) => (
            <li key={booking.id}>
              <BookingCard booking={booking} perspective="customer" />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button to="/customer/book">Book a consultation</Button>
        <Button to="/customer/bookings" variant="gold-outline">
          View all bookings
        </Button>
      </div>
    </section>
  )
}
