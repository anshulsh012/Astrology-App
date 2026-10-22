import { fetchCurrentUser } from '../services/auth'
import type { AuthUser } from '../types/auth'

let inFlightProbe: Promise<AuthUser> | null = null

export function resetAuthProbe() {
  inFlightProbe = null
}

export function probeSession(): Promise<AuthUser> {
  if (inFlightProbe === null) {
    inFlightProbe = fetchCurrentUser().finally(() => {
      inFlightProbe = null
    })
  }
  return inFlightProbe
}
