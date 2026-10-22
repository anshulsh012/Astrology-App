import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { ADMIN, ASTROLOGER, CUSTOMER, jsonResponse, mockFetch } from '../test/authFixtures'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('authentication', () => {
  it('registers through the API and lands in the customer area', async () => {
    const fetchMock = mockFetch((url) => {
      if (url.includes('/api/v1/auth/register')) {
        return jsonResponse({ ...CUSTOMER, id: 9, email: 'new@example.com' }, 201)
      }
      if (url.includes('/api/v1/auth/me')) {
        return jsonResponse({ detail: 'Not authenticated' }, 401)
      }
      if (url.includes('/api/v1/bookings/me')) {
        return jsonResponse({ items: [], page: 1, page_size: 20, total: 0, total_pages: 1, has_next: false, has_prev: false })
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText(/^Password$/), 'password12')
    await user.type(screen.getByLabelText('Confirm password'), 'password12')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/auth/register',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
    expect(await screen.findByRole('heading', { name: 'Namaste, New' })).toBeInTheDocument()
    expect(screen.getAllByText('new@example.com').length).toBeGreaterThan(0)
  })

  it('logs in through the API and restores the session user', async () => {
    const fetchMock = mockFetch((url) => {
      if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/me')) {
        if (url.includes('/api/v1/auth/login')) return jsonResponse(CUSTOMER)
        return jsonResponse({ detail: 'Not authenticated' }, 401)
      }
      if (url.includes('/api/v1/bookings/me')) {
        return jsonResponse({ items: [], page: 1, page_size: 20, total: 0, total_pages: 1, has_next: false, has_prev: false })
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password12')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })
    expect(await screen.findByRole('heading', { name: 'Namaste, User' })).toBeInTheDocument()
  })

  it('shows a backend-unreachable error on register without fabricating success', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/register')) {
        return jsonResponse(
          { detail: 'Cannot reach the server. Check that the backend is running.' },
          503,
        )
      }
      return jsonResponse({ detail: 'Not authenticated' }, 401)
    })
    const user = userEvent.setup()
    renderApp('/register')

    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText(/^Password$/), 'password12')
    await user.type(screen.getByLabelText('Confirm password'), 'password12')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('shows invalid credentials without fabricating success', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/login')) {
        return jsonResponse({ detail: 'Invalid email or password' }, 401)
      }
      return jsonResponse({ detail: 'Not authenticated' }, 401)
    })
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password12')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i)
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows validation errors without calling the API', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ detail: 'Not authenticated' }, 401))
    const user = userEvent.setup()
    renderApp('/login')

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.anything(),
    )
  })

  it('initializes the current user from /auth/me', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    renderApp('/')
    expect(await screen.findByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('logs out, clears the session and returns to public browsing', async () => {
    const fetchMock = mockFetch((url) => {
      if (url.includes('/api/v1/auth/logout')) return jsonResponse({ ok: true })
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/me')) {
        return jsonResponse({ items: [], page: 1, page_size: 20, total: 0, total_pages: 1, has_next: false, has_prev: false })
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    const user = userEvent.setup()
    renderApp('/customer')

    expect(await screen.findByRole('heading', { name: 'Namaste, User' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Log out' })[0])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    expect(await screen.findByRole('heading', { name: 'Find Guidance for a Brighter Tomorrow' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument()
  })

  it('treats a missing session as signed out', async () => {
    mockFetch(() => jsonResponse({ detail: 'Not authenticated' }, 401))
    renderApp('/customer')
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument()
  })

  it('shows a terminating error when the session probe cannot reach the server', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch
    renderApp('/customer')
    expect(await screen.findByRole('heading', { name: 'We could not verify your session' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument()
  })

  it('sends a customer away from the admin area', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(CUSTOMER)
      if (url.includes('/api/v1/bookings/me')) {
        return jsonResponse({ items: [], page: 1, page_size: 20, total: 0, total_pages: 1, has_next: false, has_prev: false })
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'Namaste, User' })).toBeInTheDocument()
  })

  it('keeps astrologer and admin areas role-specific', async () => {
    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(ASTROLOGER)
      if (url.includes('/api/v1/bookings/astrologer/me')) {
        return jsonResponse({ items: [], page: 1, page_size: 20, total: 0, total_pages: 1, has_next: false, has_prev: false })
      }
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    renderApp('/astrologer')
    expect(await screen.findByRole('heading', { name: 'Astrologer area' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Incoming requests' })).toBeInTheDocument()

    mockFetch((url) => {
      if (url.includes('/api/v1/auth/me')) return jsonResponse(ADMIN)
      return jsonResponse({ detail: 'Not found' }, 404)
    })
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'Admin area' })).toBeInTheDocument()
  })

  it('keeps public browsing available without a session', async () => {
    mockFetch(() => jsonResponse({ detail: 'Not authenticated' }, 401))
    renderApp('/astrologers')
    expect(await screen.findByRole('heading', { level: 1, name: 'Astrologers' })).toBeInTheDocument()
  })
})
