import { useEffect, useState } from 'react'
import { BookingCard } from '../components/bookings/BookingCard'
import { Button } from '../components/ui/Button'
import {
  acceptBooking,
  bookingErrorMessage,
  cancelBooking,
  listAstrologerBookings,
  rejectBooking,
} from '../services/bookings'
import type { Booking } from '../types/booking'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: Booking[] }

export function AstrologerBookingsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAstrologerBookings()
      .then((page) => {
        if (!cancelled) setState({ status: 'ready', items: page.items })
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: bookingErrorMessage(error, 'Booking requests could not be loaded.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function replace(booking: Booking) {
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', items: current.items.map((item) => (item.id === booking.id ? booking : item)) }
        : current,
    )
  }

  async function run(booking: Booking, action: (id: number) => Promise<Booking>, fallback: string) {
    if (busyId) return
    setBusyId(booking.id)
    setActionError(null)
    try {
      replace(await action(booking.id))
    } catch (error) {
      setActionError(bookingErrorMessage(error, fallback))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Astrologer</p>
      <h1 className="mt-3 font-serif text-4xl text-cream">Consultation requests</h1>
      <p className="mt-3 text-sm leading-relaxed text-lavender">
        Accept or reject pending requests for your approved profile. Live chat, video, and payments
        are not part of this step.
      </p>

      {state.status === 'loading' ? <p className="mt-8 text-sm text-lavender">Loading requests…</p> : null}
      {state.status === 'error' ? (
        <p role="alert" className="mt-8 text-sm text-gold-soft">
          {state.message}
        </p>
      ) : null}
      {state.status === 'ready' && state.items.length === 0 ? (
        <p className="mt-8 text-sm text-lavender">No consultation requests yet.</p>
      ) : null}
      {state.status === 'ready' && state.items.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {state.items.map((booking) => (
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
                onCancel={(item) => {
                  void run(item, cancelBooking, 'This booking could not be cancelled.')
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

      <div className="mt-8">
        <Button to="/astrologer" variant="gold-outline">
          Back to astrologer area
        </Button>
      </div>
    </section>
  )
}
