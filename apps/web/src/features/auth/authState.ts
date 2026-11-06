import type { AuthUserResponse } from '@orbit/api/generated/types.gen'
import { i18n } from '@/i18n'

interface AuthGateInput {
  /** `undefined` until the setup status has loaded once. */
  setupComplete: boolean | undefined
  /** `null` is signed out (a 401); `undefined` until the user has loaded once. */
  user: AuthUserResponse | null | undefined
  /** A load that does not work (`firstLoadFailed`). A refetch that lost the connection, with data from before, is not this. */
  failed: boolean
}

export type AuthGateState = 'loading' | 'unavailable' | 'setup' | 'login' | 'authenticated'

export function initialLoginValues(development: boolean) {
  return development
    ? { email: 'test@example.com', password: 'password' }
    : { email: '', password: '' }
}

export function recoveryRequestCopy() {
  return { title: i18n.t('auth:recovery.requestTitle'), detail: i18n.t('auth:recovery.requestDetail') }
}

// The success messages of the recovery and registration requests that Orbit translates.
const ACCEPTED = ['auth:accepted.recoveryGeneric', 'auth:accepted.recoveryEmailed', 'auth:accepted.registrationSent'] as const

/** The `detail` of a 202 answer in the UI language when its English text is known, else as the server sent it. */
export function acceptedDetail(detail: string): string {
  const key = ACCEPTED.find((candidate) => i18n.t(candidate, { lng: 'en' }) === detail)
  return key ? i18n.t(key) : detail
}

export function authGateState(input: AuthGateInput): AuthGateState {
  // A refetch the server refused (a 409 after a deploy) is `failed` even with a user from before; a lost connection is
  // not, so then what the gate knows keeps the app on screen.
  if (input.failed) return 'unavailable'
  if (input.setupComplete === false) return 'setup'
  if (input.setupComplete && input.user === null) return 'login'
  if (input.setupComplete && input.user) return 'authenticated'
  return 'loading'
}
