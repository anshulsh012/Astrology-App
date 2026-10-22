import { render, screen } from '@testing-library/react'
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

function renderApp(path = '/customer') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('customer dashboard', () => {
  it('renders the signed-in customer from session data', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({ ...CUSTOMER, email: 'meera.iyer@example.com' })
      }
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(EMPTY_BOOKINGS)
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Namaste, Meera Iyer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Find your astrologer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming bookings' })).toBeInTheDocument()
    expect(await screen.findByText(/no upcoming bookings/i)).toBeInTheDocument()
    expect(screen.queryByText('user@example.com')).not.toBeInTheDocument()
    expect(screen.getAllByText('meera.iyer@example.com').length).toBeGreaterThan(0)
  })

  it('navigates explore astrologers to the directory', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(EMPTY_BOOKINGS)
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Namaste, User' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: 'Explore astrologers' })[0])
    expect(await screen.findByRole('heading', { level: 1, name: 'Astrologers' })).toBeInTheDocument()
  })

  it('opens the bookings list from dashboard cards', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(EMPTY_BOOKINGS)
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp()

    expect(await screen.findByRole('heading', { name: 'My Bookings' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /My Bookings/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'My Bookings' })).toBeInTheDocument()
    expect(await screen.findByText(/no bookings yet/i)).toBeInTheDocument()
  })

  it('opens the session profile without inventing extra fields', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({ ...CUSTOMER, email: 'priya@example.com' })
      }
      if (url.includes('/api/v1/bookings/me')) return jsonResponse(EMPTY_BOOKINGS)
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Namaste, Priya' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /My Profile/ }))
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument()
    expect(screen.getAllByText('priya@example.com').length).toBeGreaterThan(0)
    expect(screen.getByText('customer')).toBeInTheDocument()
  })

  it('redirects unauthenticated visitors to login', async () => {
    mockFetch(() => jsonResponse({ detail: 'Not authenticated' }, 401))
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument()
  })

  it('shows a terminating error when the session probe fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch
    renderApp()
    expect(await screen.findByRole('heading', { name: 'We could not verify your session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument()
  })
})
