import { useEffect, useState } from 'react'
import { BookingCard } from '../components/bookings/BookingCard'
import { Button } from '../components/ui/Button'
import { bookingErrorMessage, cancelBooking, listMyBookings } from '../services/bookings'
import type { Booking } from '../types/booking'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: Booking[] }

export function CustomerBookingsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMyBookings()
      .then((page) => {
        if (!cancelled) setState({ status: 'ready', items: page.items })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: bookingErrorMessage(error, 'Bookings could not be loaded.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleCancel(booking: Booking) {
    if (busyId) return
    setBusyId(booking.id)
    setActionError(null)
    try {
      const updated = await cancelBooking(booking.id)
      setState((current) =>
        current.status === 'ready'
          ? { status: 'ready', items: current.items.map((item) => (item.id === updated.id ? updated : item)) }
          : current,
      )
    } catch (error) {
      setActionError(bookingErrorMessage(error, 'This booking could not be cancelled.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Account</p>
      <h1 className="mt-3 font-serif text-4xl text-cream">My Bookings</h1>
      <p className="mt-3 text-sm leading-relaxed text-lavender">
        Requests and confirmed sessions for this account. Payment and live consultation are not
        included.
      </p>

      {state.status === 'loading' ? <p className="mt-8 text-sm text-lavender">Loading bookings…</p> : null}
      {state.status === 'error' ? (
        <p role="alert" className="mt-8 text-sm text-gold-soft">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' && state.items.length === 0 ? (
        <p className="mt-8 text-sm text-lavender">No bookings yet. Nothing is scheduled.</p>
      ) : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {state.items.map((booking) => (
            <li key={booking.id}>
              <BookingCard
                booking={booking}
                perspective="customer"
                busyId={busyId}
                onCancel={handleCancel}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-4 text-sm text-gold-soft">
          {actionError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to="/customer/book">Book a consultation</Button>
        <Button to="/customer" variant="gold-outline">
          Back to dashboard
        </Button>
      </div>
    </section>
  )
}
