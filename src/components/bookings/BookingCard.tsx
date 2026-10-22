import { Button } from '../ui/Button'
import { MODE_LABELS, STATUS_LABELS } from '../../lib/bookingUi'
import { formatMoney, formatSlot } from '../../services/bookings'
import type { Booking } from '../../types/booking'

type BookingCardProps = {
  booking: Booking
  perspective: 'customer' | 'astrologer'
  busyId?: number | null
  onCancel?: (booking: Booking) => void
  onAccept?: (booking: Booking) => void
  onReject?: (booking: Booking) => void
}

export function BookingCard({
  booking,
  perspective,
  busyId,
  onCancel,
  onAccept,
  onReject,
}: BookingCardProps) {
  const busy = busyId === booking.id
  const canCancel =
    Boolean(onCancel) && (booking.status === 'pending' || booking.status === 'accepted')
  const canDecide = Boolean(onAccept && onReject) && booking.status === 'pending'

  return (
    <article className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl text-cream">
            {perspective === 'customer' ? booking.astrologer_name || 'Astrologer' : booking.customer_ref || 'Customer'}
          </h3>
          <p className="mt-1 text-sm text-lavender">
            {MODE_LABELS[booking.mode]} · {booking.duration_minutes} min · {formatMoney(booking.quoted_total)}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          {STATUS_LABELS[booking.status]}
        </span>
      </div>
      <p className="mt-3 text-sm text-mist">{formatSlot(booking.start_at)}</p>
      {booking.topic ? <p className="mt-2 text-sm text-lavender">{booking.topic}</p> : null}
      {canDecide || canCancel ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canDecide ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => onAccept?.(booking)}>
                {busy ? 'Working…' : 'Accept'}
              </Button>
              <Button size="sm" variant="gold-outline" disabled={busy} onClick={() => onReject?.(booking)}>
                Reject
              </Button>
            </>
          ) : null}
          {canCancel ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onCancel?.(booking)}>
              {busy ? 'Cancelling…' : 'Cancel'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
