import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Footer from '../components/Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Footer API status (loading / error handling)', () => {
  it('shows a loading state while the health check is in flight', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})), // never resolves
    );

    renderFooter();
    expect(screen.getByTestId('api-status')).toHaveTextContent(/checking api/i);
  });

  it('shows an error state when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    renderFooter();
    expect(await screen.findByTestId('api-status')).toHaveTextContent(/api offline/i);
  });

  it('shows an error state when the API returns a non-2xx status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    renderFooter();
    expect(await screen.findByTestId('api-status')).toHaveTextContent(/api offline/i);
  });

  it('shows a healthy state when the backend responds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', service: 'nakshtra-api' }),
      }),
    );

    renderFooter();
    expect(await screen.findByTestId('api-status')).toHaveTextContent(/api online \(ok\)/i);
  });
});