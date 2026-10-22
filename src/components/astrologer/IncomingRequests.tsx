import { useEffect, useState } from 'react'
import { BookingCard } from '../bookings/BookingCard'
import { Button } from '../ui/Button'
import {
  acceptBooking,
  bookingErrorMessage,
  listAstrologerBookings,
  rejectBooking,
} from '../../services/bookings'
import type { Booking } from '../../types/booking'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: Booking[] }

export function IncomingRequests() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAstrologerBookings()
      .then((page) => {
        if (!cancelled) {
          setState({
            status: 'ready',
            items: page.items.filter((item) => item.status === 'pending'),
          })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: bookingErrorMessage(error, 'Incoming requests could not be loaded.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function run(booking: Booking, action: (id: number) => Promise<Booking>, fallback: string) {
    if (busyId) return
    setBusyId(booking.id)
    setActionError(null)
    try {
      const updated = await action(booking.id)
      setState((current) =>
        current.status === 'ready'
          ? {
              status: 'ready',
              items: current.items
                .map((item) => (item.id === updated.id ? updated : item))
                .filter((item) => item.status === 'pending'),
            }
          : current,
      )
    } catch (error) {
      setActionError(bookingErrorMessage(error, fallback))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-labelledby="incoming-requests-heading" className="mt-8 rounded-2xl border border-line bg-card p-6">
      <h2 id="incoming-requests-heading" className="font-serif text-3xl text-cream">
        Incoming requests
      </h2>
      {state.status === 'loading' ? <p className="mt-3 text-sm text-lavender">Loading requests…</p> : null}
      {state.status === 'error' ? (
        <p role="alert" className="mt-3 text-sm text-gold-soft">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' && state.items.length === 0 ? (
        <p className="mt-3 text-sm text-lavender">No pending consultation requests.</p>
      ) : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {state.items.slice(0, 3).map((booking) => (
            <li key={booking.id}>
              <BookingCard
                booking={booking}
                perspective="astrologer"
                busyId={busyId}
                onAccept={(item) => {
                  void run(item, acceptBooking, 'This request could not be accepted.')
                }}
                onReject={(item) => {
                  void run(item, rejectBooking, 'This request could not be rejected.')
                }}
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
      <div className="mt-6">
        <Button to="/astrologer/bookings" variant="gold-outline">
          View all requests
        </Button>
      </div>
    </section>
  )
}
