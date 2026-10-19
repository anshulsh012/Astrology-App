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

const CUSTOMER = {
  id: 1,
  email: 'user@example.com',
  role: 'customer',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

function routerWithEntries(entries: string[]) {
  return createMemoryRouter(routes, { initialEntries: entries });
}

/** Signed-out session probe: `/auth/me` answers 401. */
function signedOut(): void {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(jsonResponse({ detail: 'Not authenticated' }, 401)) as unknown as typeof fetch;
}

/** Route chunks are lazy, so the first paint is the hydrate fallback. */
async function renderLoginPage(): Promise<void> {
  render(<RouterProvider router={routerWithEntries(['/login'])} />);
  await screen.findByRole('heading', { name: /sign in/i });
}

async function renderRegisterPage(): Promise<void> {
  render(<RouterProvider router={routerWithEntries(['/register'])} />);
  await screen.findByRole('heading', { name: /create a customer account/i });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('login page', () => {
  it('renders email and password fields, sign-in button, and links', async () => {
    signedOut();
    await renderLoginPage();

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
  });

  it('shows validation errors for empty fields on submit', async () => {
    signedOut();
    await renderLoginPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password', async () => {
    signedOut();
    await renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('submits the API call and lands on the customer area', async () => {
    signedOut();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/login') || url.endsWith('/api/v1/auth/me')) {
        return Promise.resolve(jsonResponse(CUSTOMER));
      }
      return Promise.resolve(jsonResponse({ detail: 'Not authenticated' }, 401));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const router = routerWithEntries(['/login']);
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { name: /sign in/i });
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/customer'));
  });

  it('shows server error when login API returns 401', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Invalid email or password' }, 401));
    await renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows server error when login API returns 500', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Internal server error' }, 500));
    await renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/login failed/i)).toBeInTheDocument();
  });
});

describe('register page', () => {
  it('renders the registration form with role disclosure', async () => {
    signedOut();
    await renderRegisterPage();

    expect(screen.getByText(/public registration creates a/i)).toBeInTheDocument();
    // Both the form card and the header render a "Sign in" link; all of them
    // must point at /login.
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    for (const link of signInLinks) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });

  it('shows password mismatch error', async () => {
    signedOut();
    await renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submits registration to the API', async () => {
    signedOut();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/register')) {
        return Promise.resolve(jsonResponse({ ...CUSTOMER, id: 2, email: 'new@example.com' }, 201));
      }
      return Promise.resolve(jsonResponse({ detail: 'Not authenticated' }, 401));
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/register'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});

describe('protected routes settle instead of spinning forever', () => {
  it('shows the session check while /auth/me is pending, then renders the login form', async () => {
    let release: (value: Response) => void = () => {};
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    ) as unknown as typeof fetch;

    render(<RouterProvider router={routerWithEntries(['/customer'])} />);

    expect(await screen.findByText(/checking session/i)).toBeInTheDocument();

    release(jsonResponse({ detail: 'Not authenticated' }, 401));

    // The guard must leave the loading state once the probe resolves as a 401.
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument();
  });

  it('redirects /customer to /login when unauthenticated', async () => {
    signedOut();
    render(<RouterProvider router={routerWithEntries(['/customer'])} />);

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
  });

  it('redirects /admin to /login when unauthenticated', async () => {
    signedOut();
    render(<RouterProvider router={routerWithEntries(['/admin'])} />);

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('sends a signed-in customer away from the admin console', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(CUSTOMER)) as unknown as typeof fetch;

    const router = routerWithEntries(['/admin']);
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(router.state.location.pathname).toBe('/customer'));
    expect(await screen.findByText(/consult an astrologer/i)).toBeInTheDocument();
  });

  it('shows a retryable error, not a spinner, when the API is unreachable', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    render(<RouterProvider router={routerWithEntries(['/customer'])} />);

    expect(await screen.findByText(/couldn.t verify your session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument();
  });
});
