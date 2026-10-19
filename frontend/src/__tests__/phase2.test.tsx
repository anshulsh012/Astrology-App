import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { routes } from '../routes';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  } as unknown as Response;
}

const ASTROLOGER = {
  id: 1,
  email: 'meera@example.com',
  role: 'astrologer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const CUSTOMER = {
  id: 2,
  email: 'cust@example.com',
  role: 'customer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

const ADMIN = {
  id: 3,
  email: 'admin@example.com',
  role: 'admin',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

function publicAstrologer(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    display_name: 'Guru Meera',
    bio: 'Vedic astrologer guiding seekers through charts for over six years.',
    profile_image_url: null,
    years_experience: 6,
    languages: ['English', 'Hindi'],
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
    available_from: null,
    available_to: null,
    timezone_name: 'Asia/Kolkata',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function page(items: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    items,
    page: 1,
    page_size: 12,
    total: items.length,
    total_pages: 1,
    has_next: false,
    has_prev: false,
    ...overrides,
  };
}

/**
 * Route-by-route fetch mock. The session probe (`/auth/me`) answers with the
 * given user; every other URL is matched by substring against `handlers`.
 * Unmatched URLs fall back to a 404 JSON body.
 */
function mockFetch(user: unknown, handlers: Record<string, () => Response>) {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/v1/auth/me')) {
      return Promise.resolve(
        user ? jsonResponse(user) : jsonResponse({ detail: 'Not authenticated' }, 401),
      );
    }
    for (const [needle, respond] of Object.entries(handlers)) {
      if (url.includes(needle)) return Promise.resolve(respond());
    }
    return Promise.resolve(jsonResponse({ detail: `unmocked: ${url}` }, 404));
  }) as unknown as typeof fetch;
}

/** A typed vi.fn fetch mock, assignable to globalThis.fetch via cast. */
type FetchMock = ReturnType<typeof vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>>;

function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('customer discovery page', () => {
  it('renders approved astrologers with rate, specialties and languages', async () => {
    mockFetch(CUSTOMER, {
      '/api/v1/astrologers': () => jsonResponse(page([publicAstrologer()])),
    });
    renderRoute('/customer');

    expect(await screen.findByText('Guru Meera')).toBeInTheDocument();
    expect(screen.getByText('₹12.50/min')).toBeInTheDocument();
    expect(screen.getByText('Kundli')).toBeInTheDocument();
    expect(screen.getByText('Hindi')).toBeInTheDocument();
    expect(screen.getByText(/6 years experience/)).toBeInTheDocument();
  });

  it('shows a loading state while the request is pending', async () => {
    let release: (value: Response) => void = () => {};
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(CUSTOMER));
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    }) as unknown as typeof fetch;

    renderRoute('/customer');

    expect(await screen.findByTestId('discovery-loading')).toBeInTheDocument();

    release(jsonResponse(page([publicAstrologer()])));
    expect(await screen.findByText('Guru Meera')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-loading')).not.toBeInTheDocument();
  });

  it('shows a retryable error when the API fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(CUSTOMER));
      if (url.includes('/api/v1/astrologers')) {
        return Promise.resolve(jsonResponse({ detail: 'boom' }, 500));
      }
      return Promise.resolve(jsonResponse({}, 404));
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    renderRoute('/customer');

    expect(await screen.findByTestId('discovery-error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    // Retry succeeds: flip the mock to a healthy response.
    (fetchMock as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(CUSTOMER));
        return Promise.resolve(jsonResponse(page([publicAstrologer()])));
      },
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Guru Meera')).toBeInTheDocument();
    expect(screen.queryByTestId('discovery-error')).not.toBeInTheDocument();
  });

  it('shows the empty state when no astrologers match', async () => {
    mockFetch(CUSTOMER, {
      '/api/v1/astrologers': () => jsonResponse(page([])),
    });
    renderRoute('/customer');

    expect(await screen.findByTestId('discovery-empty')).toBeInTheDocument();
  });

  it('sends search parameters to the backend', async () => {
    const fetchMock: FetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(CUSTOMER));
      if (url.includes('/api/v1/astrologers')) return Promise.resolve(jsonResponse(page([])));
      return Promise.resolve(jsonResponse({}, 404));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderRoute('/customer');
    await screen.findByTestId('discovery-empty');

    await userEvent.type(screen.getByPlaceholderText(/search by name/i), 'meera');
    await userEvent.type(screen.getByPlaceholderText(/kundli/i), 'Kundli');
    await userEvent.selectOptions(screen.getByLabelText(/^mode/i), 'chat');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      const discoveryCall = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .find(
          (url) =>
            url.includes('/api/v1/astrologers?') &&
            url.includes('q=meera') &&
            url.includes('specialty=Kundli') &&
            url.includes('mode=chat'),
        );
      expect(discoveryCall).toBeDefined();
    });
  });
});

describe('astrologer dashboard', () => {
  const validProfile = {
    id: 9,
    display_name: 'Guru Meera',
    bio: 'Vedic astrologer guiding seekers through charts for six years.',
    profile_image_url: null,
    years_experience: 6,
    languages: ['English', 'Hindi'],
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
    available_from: null,
    available_to: null,
    timezone_name: 'Asia/Kolkata',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    approval_status: 'draft',
    rejection_reason: null,
    submitted_at: null,
    reviewed_at: null,
  };

  it('shows the create form when no profile exists yet', async () => {
    mockFetch(ASTROLOGER, {
      '/api/v1/astrologer/profile': () => jsonResponse({ detail: 'no profile' }, 404),
    });
    renderRoute('/astrologer');

    expect(await screen.findByRole('heading', { level: 1, name: /your profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument();
    expect(screen.queryByTestId('status-banner')).not.toBeInTheDocument();
  });

  it('validates required fields before creating', async () => {
    mockFetch(ASTROLOGER, {
      '/api/v1/astrologer/profile': () => jsonResponse({ detail: 'no profile' }, 404),
    });
    renderRoute('/astrologer');
    await screen.findByRole('button', { name: /create profile/i });

    await userEvent.click(screen.getByRole('button', { name: /create profile/i }));

    expect(await screen.findByText(/display name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/bio must be at least 20 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/add at least one language/i)).toBeInTheDocument();
  });

  it('creates a profile and shows the draft status banner', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(ASTROLOGER));
      if (url.includes('/api/v1/astrologer/profile') && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ ...validProfile }, 201));
      }
      if (url.includes('/api/v1/astrologer/profile')) {
        return Promise.resolve(jsonResponse({ detail: 'no profile' }, 404));
      }
      return Promise.resolve(jsonResponse({}, 404));
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    renderRoute('/astrologer');
    await screen.findByRole('button', { name: /create profile/i });

    await userEvent.type(screen.getByPlaceholderText(/how customers will see you/i), 'Guru Meera');
    await userEvent.type(
      screen.getByPlaceholderText(/your experience, approach/i),
      'Vedic astrologer guiding seekers through charts for six years.',
    );
    await userEvent.clear(screen.getByLabelText(/years of experience/i));
    await userEvent.type(screen.getByLabelText(/years of experience/i), '6');
    await userEvent.type(screen.getByPlaceholderText(/hindi, english/i), 'Hindi, English');
    await userEvent.type(screen.getByPlaceholderText(/kundli, vedic/i), 'Kundli');
    await userEvent.click(screen.getByRole('checkbox', { name: /chat/i }));
    await userEvent.type(screen.getByLabelText(/rate \(₹\/min\)/i), '12.50');

    await userEvent.click(screen.getByRole('button', { name: /create profile/i }));

    expect(await screen.findByTestId('status-banner')).toHaveTextContent(/draft/i);
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
  });

  it('shows rejection feedback and a resubmit action for rejected profiles', async () => {
    mockFetch(ASTROLOGER, {
      '/api/v1/astrologer/profile': () =>
        jsonResponse({
          ...validProfile,
          approval_status: 'rejected',
          rejection_reason: 'Please add your certifications.',
        }),
    });
    renderRoute('/astrologer');

    expect(await screen.findByTestId('status-banner')).toHaveTextContent(/changes requested/i);
    expect(screen.getByText(/admin feedback: please add your certifications/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeInTheDocument();
  });

  it('locks editing and hides submit for approved profiles', async () => {
    mockFetch(ASTROLOGER, {
      '/api/v1/astrologer/profile': () =>
        jsonResponse({ ...validProfile, approval_status: 'approved' }),
    });
    renderRoute('/astrologer');

    expect(await screen.findByTestId('status-banner')).toHaveTextContent(/approved/i);
    expect(screen.getByLabelText(/display name/i)).toBeDisabled();
    expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('submits the profile for review from the draft state', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(ASTROLOGER));
      if (url.includes('/submit') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            ...validProfile,
            approval_status: 'pending',
            submitted_at: '2026-02-01T00:00:00Z',
          }),
        );
      }
      if (url.includes('/api/v1/astrologer/profile')) return Promise.resolve(jsonResponse(validProfile));
      return Promise.resolve(jsonResponse({}, 404));
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    renderRoute('/astrologer');
    await screen.findByTestId('status-banner');

    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }));

    await waitFor(() =>
      expect(screen.getByTestId('status-banner')).toHaveTextContent(/pending review/i),
    );
    expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument();
  });
});

describe('admin review console', () => {
  const application = {
    ...publicAstrologer(),
    approval_status: 'pending',
    rejection_reason: null,
    submitted_at: '2026-02-01T00:00:00Z',
    reviewed_at: null,
    user_id: 42,
    applicant_email: 'applicant@example.com',
    applicant_is_active: true,
    reviewed_by_id: null,
  };

  it('lists pending applications with applicant email', async () => {
    mockFetch(ADMIN, {
      '/api/v1/admin/astrologers/applications': () => jsonResponse(page([application])),
    });
    renderRoute('/admin');

    expect(await screen.findByText('Guru Meera')).toBeInTheDocument();
    expect(screen.getByText('applicant@example.com')).toBeInTheDocument();
    // Status badge inside the row (the "Pending" filter tab is a button).
    expect(screen.getByText(/^pending$/i, { selector: 'span' })).toBeInTheDocument();
  });

  it('approves an application and refreshes the list', async () => {
    const fetchMock: FetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(ADMIN));
      if (url.includes('/approve') && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({ ...application, approval_status: 'approved', reviewed_by_id: 3 }),
        );
      }
      if (url.includes('/applications')) {
        // First load: one pending application. After approval: empty list.
        const calls = fetchMock.mock.calls.filter((call) =>
          String(call[0]).includes('/applications'),
        ).length;
        if (calls <= 1) return Promise.resolve(jsonResponse(page([application])));
        return Promise.resolve(jsonResponse(page([])));
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderRoute('/admin');
    await screen.findByText('Guru Meera');

    await userEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(await screen.findByTestId('applications-empty')).toBeInTheDocument();
  });

  it('rejects only with a reason of sufficient length', async () => {
    const fetchMock: FetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(ADMIN));
      if (url.includes('/applications')) return Promise.resolve(jsonResponse(page([application])));
      return Promise.resolve(jsonResponse({}, 404));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderRoute('/admin');
    await screen.findByText('Guru Meera');

    await userEvent.click(screen.getByRole('button', { name: /reject/i }));
    await userEvent.type(screen.getByPlaceholderText(/explain what the applicant/i), 'no');
    await userEvent.click(screen.getByRole('button', { name: /confirm rejection/i }));

    expect(await screen.findByText(/at least 5 characters/i)).toBeInTheDocument();
    // No reject call left the client: the button flow stayed put.
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/reject'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows the empty state when no pending applications exist', async () => {
    mockFetch(ADMIN, {
      '/api/v1/admin/astrologers/applications': () => jsonResponse(page([])),
    });
    renderRoute('/admin');

    expect(await screen.findByTestId('applications-empty')).toBeInTheDocument();
    expect(screen.getByText(/no pending applications right now/i)).toBeInTheDocument();
  });

  it('shows a retryable error when loading fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/auth/me')) return Promise.resolve(jsonResponse(ADMIN));
      if (url.includes('/applications')) return Promise.resolve(jsonResponse({ detail: 'nope' }, 500));
      return Promise.resolve(jsonResponse({}, 404));
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    renderRoute('/admin');

    expect(await screen.findByTestId('applications-error')).toBeInTheDocument();
  });
});
