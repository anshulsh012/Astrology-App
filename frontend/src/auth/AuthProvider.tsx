import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../lib/api';
import {
  fetchCurrentUser,
  performLogout,
  type AuthUser,
} from '../hooks/useAuth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  /** Re-run the session check (used by the retry button). */
  refresh: () => Promise<void>;
  /** Adopt the user returned by login/registration without a second round-trip. */
  signIn: (user: AuthUser) => void;
  /** Clear the server session and local state. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Dedupe the session probe. React StrictMode mounts effects twice in
 * development, and the header/footer may mount before the route settles;
 * all of them must share one `/auth/me` request.
 */
let inFlightProbe: Promise<AuthUser> | null = null;

function probeSession(): Promise<AuthUser> {
  if (inFlightProbe === null) {
    inFlightProbe = fetchCurrentUser().finally(() => {
      inFlightProbe = null;
    });
  }
  return inFlightProbe;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.status >= 500
      ? `The server could not complete the session check (HTTP ${err.status}).`
      : `The session check failed (HTTP ${err.status}).`;
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'The server took too long to respond.';
  }
  return 'Cannot reach the server. Check that the backend is running.';
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Monotonic token so a stale probe can never overwrite a newer result.
  const requestSeq = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async (): Promise<void> => {
    const seq = ++requestSeq.current;
    setStatus('loading');
    setError(null);

    try {
      const current = await probeSession();
      if (!mounted.current || seq !== requestSeq.current) return;
      setUser(current);
      setStatus('authenticated');
    } catch (err) {
      if (!mounted.current || seq !== requestSeq.current) return;
      setUser(null);
      if (err instanceof ApiError && err.status === 401) {
        // Expected signed-out case: not an error, just no session.
        setStatus('unauthenticated');
        setError(null);
        return;
      }
      setStatus('error');
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      // Invalidate any probe that is still in flight for this lifecycle.
      requestSeq.current += 1;
    };
  }, [refresh]);

  const signIn = useCallback((nextUser: AuthUser): void => {
    requestSeq.current += 1;
    setUser(nextUser);
    setStatus('authenticated');
    setError(null);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await performLogout();
    } catch {
      // The local session is cleared regardless: the cookie is either gone
      // already or unreachable, and the UI must not stay signed in.
    }
    requestSeq.current += 1;
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, refresh, signIn, signOut }),
    [status, user, error, refresh, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
