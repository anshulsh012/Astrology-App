import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { ASTROLOGER, CUSTOMER, jsonResponse, mockFetch } from '../test/authFixtures'
import type { Booking } from '../types/booking'

const EMPTY_PAGE = {
  items: [] as Booking[],
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false,
}

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: 11,
    customer_id: 1,
    astrologer_profile_id: 7,
    mode: 'chat',
    start_at: '2099-01-01T10:00:00Z',
    end_at: '2099-01-01T10:30:00Z',
    status: 'pending',
    topic: 'Kundli review',
    duration_minutes: 30,
    rate_per_minute: '12.50',
    quoted_total: '375.00',
    decision_at: null,
    cancelled_at: null,
    created_at: '2026-10-21T00:00:00Z',
    updated_at: '2026-10-21T00:00:00Z',
    astrologer_name: 'Guru Meera',
    customer_ref: 'us****@example.com',
    ...overrides,
  }
}

function pageOf(items: Booking[]) {
  return { ...EMPTY_PAGE, items, total: items.length }
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('booking workflow', () => {
  it('lets a customer cancel a pending booking', async () => {
    const pending = booking({ id: 21, status: 'pending' })
    const fetchMock = mockFetch((url, init) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/21/cancel') && init?.method === 'POST') {
        return jsonResponse({ ...pending, status: 'cancelled' })
      }
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(pageOf([pending]))
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/customer/bookings')

    expect(await screen.findByRole('heading', { name: 'Guru Meera' })).toBeInTheDocument()
    expect(await screen.findByText('Pending')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/bookings/21/cancel',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
    expect(await screen.findByText('Cancelled')).toBeInTheDocument()
  })

  it('lets an astrologer accept a pending request from the dashboard', async () => {
    const pending = booking({ id: 31, status: 'pending' })
    const fetchMock = mockFetch((url, init) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(ASTROLOGER)
      if (url.includes('/api/v1/bookings/31/accept') && init?.method === 'POST') {
        return jsonResponse({ ...pending, status: 'accepted' })
      }
      if (url.includes('/api/v1/bookings/astrologer/me')) return jsonResponse(pageOf([pending]))
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/astrologer')

    expect(await screen.findByRole('heading', { name: 'Incoming requests' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'us****@example.com' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Accept' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/bookings/31/accept',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
    expect(await screen.findByText('No pending consultation requests.')).toBeInTheDocument()
  })

  it('lets an astrologer reject a pending request from the queue', async () => {
    const pending = booking({ id: 41, status: 'pending' })
    const fetchMock = mockFetch((url, init) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(ASTROLOGER)
      if (url.includes('/api/v1/bookings/41/reject') && init?.method === 'POST') {
        return jsonResponse({ ...pending, status: 'rejected' })
      }
      if (url.includes('/api/v1/bookings/astrologer/me')) return jsonResponse(pageOf([pending]))
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/astrologer/bookings')

    expect(await screen.findByRole('heading', { name: 'Consultation requests' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'us****@example.com' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Reject' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/bookings/41/reject',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
    expect(await screen.findByText('Rejected')).toBeInTheDocument()
  })
})
