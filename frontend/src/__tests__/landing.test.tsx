import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../routes';

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

/**
 * Entry routes are authenticated/role-guarded since Phase 1, so the session
 * probe and the footer health check both need an answer.
 */
function withSignedInRole(role: 'customer' | 'astrologer' | 'admin'): void {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/v1/auth/me')) {
      return Promise.resolve(
        jsonResponse({
          id: 1,
          email: `${role}@example.com`,
          role,
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
        }),
      );
    }
    return Promise.resolve(jsonResponse({ status: 'ok', service: 'nakshtra-api' }));
  }) as unknown as typeof fetch;
}

describe('landing page', () => {
  it('renders the header, hero, astrologers, services and footer', async () => {
    renderRoute('/');

    // Header brand link
    expect(
      await screen.findByRole('link', { name: /nakshtra tak home/i }),
    ).toBeInTheDocument();

    // Hero
    expect(
      await screen.findByRole('heading', { level: 1, name: /written in the stars/i }),
    ).toBeInTheDocument();

    // Featured astrologer placeholders
    const astrologersSection = await screen.findByRole('region', {
      name: /meet our featured astrologers/i,
    });
    expect(astrologersSection).toBeInTheDocument();
    expect(screen.getAllByText(/1[05] years|8 years/).length).toBeGreaterThan(0);

    // Service cards
    const servicesSection = screen.getByRole('region', { name: /astrology services/i });
    expect(servicesSection).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /kundli matching/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tarot reading/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /numerology/i })).toBeInTheDocument();

    // Footer with API status (loading or resolved state present)
    expect(await screen.findByTestId('api-status')).toBeInTheDocument();
  });
});

describe('entry routes', () => {
  it.each([
    ['/customer', /consult an astrologer/i, 'customer'],
    ['/astrologer', /your profile/i, 'astrologer'],
    ['/admin', /astrologer applications/i, 'admin'],
  ] as const)('renders %s for its role', async (path, heading, role) => {
    withSignedInRole(role);
    if (role === 'astrologer') {
      // The dashboard asks for the owner's profile; a 404 means "not created
      // yet", which renders the create-profile form under the page heading.
      globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/me')) {
          return Promise.resolve(
            jsonResponse({
              id: 1,
              email: 'astrologer@example.com',
              role,
              is_active: true,
              created_at: '2026-01-01T00:00:00Z',
            }),
          );
        }
        if (url.includes('/api/v1/astrologer/profile')) {
          return Promise.resolve(jsonResponse({ detail: 'profile not found' }, 404));
        }
        return Promise.resolve(jsonResponse({ status: 'ok', service: 'nakshtra-api' }));
      }) as unknown as typeof fetch;
    }
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('shows the 404 page for unknown routes', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByRole('heading', { name: /another constellation/i })).toBeInTheDocument();
  });
});