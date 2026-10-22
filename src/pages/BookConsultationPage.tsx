import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { BOOKING_DURATIONS, type BookingMode, type Slot } from '../types/booking'
import type { PublicAstrologer } from '../types/publicAstrologer'
import { enabledModes, MODE_LABELS } from '../lib/bookingUi'
import {
  bookingErrorMessage,
  createBooking,
  formatMoney,
  formatSlot,
  getAvailability,
  listApprovedAstrologers,
  localDateInputValue,
  maxDateInputValue,
} from '../services/bookings'

type LoadState = 'loading' | 'ready' | 'error' | 'empty'

export function BookConsultationPage() {
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [astrologers, setAstrologers] = useState<PublicAstrologer[]>([])
  const [profileId, setProfileId] = useState<number | null>(null)
  const [mode, setMode] = useState<BookingMode>('chat')
  const [duration, setDuration] = useState<(typeof BOOKING_DURATIONS)[number]>(30)
  const [day, setDay] = useState(localDateInputValue(1))
  const [topic, setTopic] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotHint, setSlotHint] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadedSlotKey, setLoadedSlotKey] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selected = useMemo(
    () => astrologers.find((item) => item.id === profileId) ?? null,
    [astrologers, profileId],
  )
  const modes = selected ? enabledModes(selected) : []
  const activeMode: BookingMode = modes.includes(mode) ? mode : (modes[0] ?? 'chat')
  const slotRequestKey =
    profileId && loadState === 'ready' ? `${profileId}:${day}:${activeMode}:${duration}` : null
  const slotsReady = slotRequestKey !== null && loadedSlotKey === slotRequestKey

  useEffect(() => {
    let cancelled = false
    listApprovedAstrologers()
      .then((page) => {
        if (cancelled) return
        if (!page.items.length) {
          setLoadState('empty')
          return
        }
        const first = page.items[0]
        const firstModes = enabledModes(first)
        setAstrologers(page.items)
        setProfileId(first.id)
        if (firstModes[0]) setMode(firstModes[0])
        setLoadState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError(bookingErrorMessage(error, 'Approved astrologers could not be loaded.'))
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!slotRequestKey || !profileId) return
    let cancelled = false
    getAvailability(profileId, day, activeMode, duration)
      .then((result) => {
        if (cancelled) return
        setSlots(result.slots)
        setSlotHint(result.detail)
        setSelectedSlot(null)
        setLoadedSlotKey(slotRequestKey)
      })
      .catch((error) => {
        if (cancelled) return
        setSlots([])
        setSlotHint(bookingErrorMessage(error, 'Availability could not be loaded.'))
        setSelectedSlot(null)
        setLoadedSlotKey(slotRequestKey)
      })
    return () => {
      cancelled = true
    }
  }, [slotRequestKey, profileId, day, activeMode, duration])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !profileId || !selectedSlot) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createBooking({
        astrologer_profile_id: profileId,
        mode: activeMode,
        start_at: selectedSlot.start_at,
        end_at: selectedSlot.end_at,
        topic: topic.trim() || undefined,
      })
      navigate('/customer/bookings', { replace: true })
    } catch (error) {
      setSubmitError(bookingErrorMessage(error, 'The booking could not be created.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6" aria-busy="true">
        <p className="text-sm text-lavender">Loading approved astrologers…</p>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-serif text-4xl text-cream">Book a consultation</h1>
        <p role="alert" className="mt-4 text-lavender">
          {loadError}
        </p>
        <Button to="/customer" className="mt-6" variant="gold-outline">
          Back to dashboard
        </Button>
      </section>
    )
  }

  if (loadState === 'empty') {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-serif text-4xl text-cream">Book a consultation</h1>
        <p className="mt-4 text-lavender">
          No approved astrologers are accepting bookings yet. Sample directory profiles cannot be
          booked.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button to="/astrologers" variant="gold-outline">
            Browse sample directory
          </Button>
          <Button to="/customer" variant="secondary">
            Back to dashboard
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Consultation</p>
      <h1 className="mt-3 font-serif text-4xl text-cream">Book a consultation</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-lavender">
        Times and prices come from the server. Payment, chat, and video are not included. Sample
        directory cards are not live profiles.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-line bg-card p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm text-mist">Astrologer</span>
          <select
            value={profileId ?? ''}
            onChange={(event) => {
              const nextId = Number(event.target.value)
              const next = astrologers.find((item) => item.id === nextId)
              setProfileId(nextId)
              const nextModes = next ? enabledModes(next) : []
              if (nextModes.length && !nextModes.includes(mode)) setMode(nextModes[0])
            }}
            className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
          >
            {astrologers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.display_name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm text-mist">Mode</span>
            <select
              value={activeMode}
              onChange={(event) => setMode(event.target.value as BookingMode)}
              className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
            >
              {modes.map((item) => (
                <option key={item} value={item}>
                  {MODE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-mist">Duration</span>
            <select
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value) as (typeof BOOKING_DURATIONS)[number])}
              className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
            >
              {BOOKING_DURATIONS.map((item) => (
                <option key={item} value={item}>
                  {item} minutes
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm text-mist">Date</span>
          <input
            type="date"
            value={day}
            min={localDateInputValue(0)}
            max={maxDateInputValue(14)}
            onChange={(event) => setDay(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-plum/80 px-3 text-sm text-cream"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm text-mist">Available slots</legend>
          {!slotsReady ? <p className="text-sm text-lavender">Loading slots…</p> : null}
          {slotsReady && slots.length === 0 ? (
            <p className="text-sm text-lavender">{slotHint ?? 'No open slots for this day.'}</p>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {(slotsReady ? slots : []).map((slot) => {
              const selectedKey = selectedSlot?.start_at === slot.start_at
              return (
                <li key={slot.start_at}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
                      selectedKey
                        ? 'border-gold bg-gold/10 text-cream'
                        : 'border-line bg-plum/60 text-mist hover:border-gold/40'
                    }`}
                  >
                    <span className="block">{formatSlot(slot.start_at)}</span>
                    <span className="mt-1 block text-gold-soft">{formatMoney(slot.quoted_total)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </fieldset>

        {selectedSlot ? (
          <p className="text-sm text-cream">
            Quoted total {formatMoney(selectedSlot.quoted_total)} at {formatMoney(selectedSlot.rate_per_minute)} / min.
            This is a request, not a payment.
          </p>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm text-mist">Topic (optional)</span>
          <textarea
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl border border-line bg-plum/80 px-3 py-2 text-sm text-cream"
          />
        </label>

        <Button type="submit" className="w-full" disabled={submitting || !selectedSlot}>
          {submitting ? 'Requesting…' : 'Request consultation'}
        </Button>
        {submitError ? (
          <p role="alert" className="text-sm text-gold-soft">
            {submitError}
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-sm text-lavender">
        Need the sample directory instead?{' '}
        <Link to="/astrologers" className="text-gold hover:text-gold-soft">
          Browse sample profiles
        </Link>
      </p>
    </section>
  )
}
