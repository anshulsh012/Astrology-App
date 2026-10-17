import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Vitest's jsdom environment mixes jsdom's AbortController/AbortSignal with
 * Node's undici-backed global Request. React Router's data router creates
 * `new Request(url, { signal })` during navigation, and undici's brand check
 * throws "Expected signal to be an instance of AbortSignal" for jsdom
 * signals. Wrap Request so a foreign signal is dropped (navigation requests
 * never rely on the signal in these tests). This is a test-environment fix;
 * production code runs with consistent browser globals.
 */
const OriginalRequest = globalThis.Request;
if (typeof OriginalRequest === 'function') {
  globalThis.Request = class PatchedRequest extends OriginalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init?.signal) {
        const { signal: _signal, ...rest } = init;
        super(input, rest);
        return;
      }
      super(input, init);
    }
  } as typeof Request;
}

// No test should ever hit the network: each test starts with a rejected
// `fetch` so UI under test exercises its error path quickly and
// deterministically. Individual tests override this with their own stub.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new Error('Network disabled in tests')),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});