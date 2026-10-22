import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { CUSTOMER, jsonResponse, mockFetch } from '../test/authFixtures'

const EMPTY_BOOKINGS = {
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false,
}

const APPROVED = {
  id: 7,
  display_name: 'Guru Meera',
  bio: 'Vedic astrologer guiding seekers through charts for years.',
  profile_image_url: null,
  years_experience: 6,
  languages: ['Hindi'],
  specialties: ['Kundli'],
  chat_enabled: true,
  audio_enabled: false,
  video_enabled: false,
  chat_rate: '12.50',
  audio_rate: null,
  video_rate: null,
  consultation_modes: ['chat'],
  min_rate_per_minute: '12.50',
  is_available: true,
  available_from: '09:00',
  available_to: '18:00',
  timezone_name: 'UTC',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const SLOT = {
  start_at: '2026-10-23T10:00:00+00:00',
  end_at: '2026-10-23T10:30:00+00:00',
  duration_minutes: 30,
  rate_per_minute: '12.50',
  quoted_total: '375.00',
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('book consultation', () => {
  it('requests a booking with server-quoted slot times', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(EMPTY_BOOKINGS)
      if (url.includes('/api/v1/astrologers?')) {
        return jsonResponse({
          items: [APPROVED],
          page: 1,
          page_size: 50,
          total: 1,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        })
      }
      if (url.includes('/api/v1/bookings/availability/7')) {
        return jsonResponse({
          astrologer_profile_id: 7,
          astrologer_name: 'Guru Meera',
          timezone_name: 'UTC',
          date: '2026-10-23',
          mode: 'chat',
          duration_minutes: 30,
          is_available: true,
          slots: [SLOT],
          detail: null,
        })
      }
      if (url.includes('/api/v1/bookings') && init?.method === 'POST') {
        return jsonResponse(
          {
            id: 11,
            customer_id: 1,
            astrologer_profile_id: 7,
            mode: 'chat',
            start_at: SLOT.start_at,
            end_at: SLOT.end_at,
            status: 'pending',
            topic: null,
            duration_minutes: 30,
            rate_per_minute: '12.50',
            quoted_total: '375.00',
            decision_at: null,
            cancelled_at: null,
            created_at: '2026-10-21T00:00:00Z',
            updated_at: '2026-10-21T00:00:00Z',
            astrologer_name: 'Guru Meera',
            customer_ref: 'us****@example.com',
          },
          201,
        )
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/customer/book')

    expect(await screen.findByRole('heading', { name: 'Book a consultation' })).toBeInTheDocument()
    const slotButton = await screen.findByRole('button', { name: /375/i })
    await user.click(slotButton)
    await user.click(screen.getByRole('button', { name: 'Request consultation' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/bookings',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      )
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'My Bookings' })).toBeInTheDocument()
  })

  it('shows an empty state when no approved astrologers exist', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(EMPTY_BOOKINGS)
      if (url.includes('/api/v1/astrologers')) {
        return jsonResponse({
          items: [],
          page: 1,
          page_size: 50,
          total: 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        })
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    renderApp('/customer/book')
    expect(await screen.findByText(/no approved astrologers/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request consultation' })).not.toBeInTheDocument()
  })
})
