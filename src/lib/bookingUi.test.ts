import { describe, expect, it } from 'vitest'
import { enabledModes, upcomingBookings } from './bookingUi'
import type { Booking } from '../types/booking'

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 1,
    customer_id: 1,
    astrologer_profile_id: 7,
    mode: 'chat',
    start_at: '2099-01-01T10:00:00Z',
    end_at: '2099-01-01T10:30:00Z',
    status: 'pending',
    topic: null,
    duration_minutes: 30,
    rate_per_minute: '12.50',
    quoted_total: '375.00',
    decision_at: null,
    cancelled_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    astrologer_name: 'Guru Meera',
    customer_ref: 'us****@example.com',
    ...overrides,
  }
}

describe('booking UI helpers', () => {
  it('keeps only future pending or accepted bookings', () => {
    const items = upcomingBookings([
      booking({ id: 1, status: 'cancelled' }),
      booking({ id: 2, status: 'accepted', start_at: '2000-01-01T10:00:00Z', end_at: '2000-01-01T10:30:00Z' }),
      booking({ id: 3, status: 'pending', start_at: '2099-01-02T10:00:00Z', end_at: '2099-01-02T10:30:00Z' }),
      booking({ id: 4, status: 'accepted', start_at: '2099-01-01T09:00:00Z', end_at: '2099-01-01T09:30:00Z' }),
    ])
    expect(items.map((item) => item.id)).toEqual([4, 3])
  })

  it('reads enabled modes from the public profile', () => {
    expect(
      enabledModes({
        chat_enabled: true,
        audio_enabled: false,
        video_enabled: true,
        consultation_modes: ['chat', 'video'],
      }),
    ).toEqual(['chat', 'video'])
  })
})
