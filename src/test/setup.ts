import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { resetAuthProbe } from '../auth/sessionProbe'
import { jsonResponse } from './authFixtures'

beforeEach(() => {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/v1/auth/me')) {
      return Promise.resolve(jsonResponse({ detail: 'Not authenticated' }, 401))
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  }) as unknown as typeof fetch
})

afterEach(() => {
  cleanup()
  resetAuthProbe()
  vi.restoreAllMocks()
})
