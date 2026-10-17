import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from '../lib/api';

export interface HealthPayload {
  status: string;
  service?: string;
  version?: string;
  environment?: string;
}

export type HealthState =
  | { phase: 'loading'; data: null; error: null }
  | { phase: 'ok'; data: HealthPayload; error: null }
  | { phase: 'error'; data: null; error: string };

/**
 * Polls the backend health endpoint once on mount (with an optional poll
 * interval) and exposes explicit loading / error / success states.
 */
export function useHealth(pollIntervalMs?: number): HealthState {
  const [state, setState] = useState<HealthState>({ phase: 'loading', data: null, error: null });
  const mounted = useRef(true);

  const check = useCallback(async () => {
    try {
      const data = await fetchJson<HealthPayload>('/api/v1/health');
      if (mounted.current) {
        setState({ phase: 'ok', data, error: null });
      }
    } catch (error) {
      if (mounted.current) {
        const message =
          error instanceof Error && error.name === 'AbortError'
            ? 'Request timed out'
            : 'Backend unreachable';
        setState({ phase: 'error', data: null, error: message });
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();

    const id = pollIntervalMs ? window.setInterval(() => void check(), pollIntervalMs) : undefined;

    return () => {
      mounted.current = false;
      if (id !== undefined) {
        window.clearInterval(id);
      }
    };
  }, [check, pollIntervalMs]);

  return state;
}