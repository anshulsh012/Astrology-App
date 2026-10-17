import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../routes';

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
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
    ['/customer', /consult an astrologer/i],
    ['/astrologer', /share your wisdom with the world/i],
    ['/admin', /administration/i],
  ])('renders %s with its heading', async (path, heading) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('shows the 404 page for unknown routes', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByRole('heading', { name: /another constellation/i })).toBeInTheDocument();
  });
});