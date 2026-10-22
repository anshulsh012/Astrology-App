import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { featuredAstrologers } from './data/astrologers'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function directorySearch() {
  return within(screen.getByRole('search')).getByRole('searchbox')
}

describe('homepage', () => {
  it('renders the hero, categories and featured sample astrologers', () => {
    renderApp()

    expect(
      screen.getByRole('heading', { name: 'Find Guidance for a Brighter Tomorrow' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Astrology categories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Love and Relationships' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kundali Analysis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Astrologers to begin with' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: featuredAstrologers[0].name })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Clarity before you speak' })).toBeInTheDocument()
  })

  it('sends hero search to the astrologers directory with the query', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Search astrologers or specialties'), 'love')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Astrologers' })).toBeInTheDocument()
    expect(directorySearch()).toHaveValue('love')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Meera Iyer' })).toBeInTheDocument()
    })
  })

  it('opens a sample astrologer profile from a card', async () => {
    const user = userEvent.setup()
    renderApp()

    const links = screen.getAllByRole('link', { name: 'View profile' })
    await user.click(links[0])

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: featuredAstrologers[0].name }),
      ).toBeInTheDocument()
    })
    expect(screen.getAllByText(/Sample profile/i).length).toBeGreaterThan(0)
  })

  it('routes category cards to discovery with a specialty filter', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('heading', { name: 'Health and Wellness' }).closest('a')!)

    expect(screen.getByRole('heading', { level: 1, name: 'Astrologers' })).toBeInTheDocument()
    expect(screen.getByLabelText('Specialty')).toHaveValue('health')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nayantara Rao' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Arjun Desai' })).not.toBeInTheDocument()
  })
})

describe('discovery and accounts', () => {
  it('filters, sorts and shows an empty state on /astrologers', async () => {
    const user = userEvent.setup()
    renderApp('/astrologers')

    await waitFor(() => {
      expect(screen.getByText('6 sample profiles')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText('Specialty'), 'finance')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Arjun Desai' })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText('Sort'), 'price-asc')
    await waitFor(() => {
      const headings = screen
        .getAllByRole('heading')
        .map((node) => node.textContent)
        .filter((text) => text === 'Dev Banerjee' || text === 'Arjun Desai')
      expect(headings[0]).toBe('Dev Banerjee')
    })

    await user.clear(directorySearch())
    await user.type(directorySearch(), 'zzzz')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'No sample profiles match' })).toBeInTheDocument()
    })
  })

  it('shows a missing-profile message for unknown ids', async () => {
    renderApp('/astrologers/not-a-real-id')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Sample profile not found' }),
      ).toBeInTheDocument()
    })
  })

  it('renders login without inventing a session', async () => {
    renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('renders register without inventing a session', async () => {
    renderApp('/register')
    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('redirects /signup to register and /search to discovery', async () => {
    renderApp('/signup')
    expect(await screen.findByRole('heading', { name: 'Create an account' })).toBeInTheDocument()

    renderApp('/search?q=love')
    expect(await screen.findByRole('heading', { level: 1, name: 'Astrologers' })).toBeInTheDocument()
    expect(directorySearch()).toHaveValue('love')
  })
})
