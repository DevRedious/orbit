import { ApiProblem } from '@orbit/api/problem'
import { problemKey } from '@orbit/i18n/problem'
import { i18n } from '@/i18n'

/**
 * The message to show for a failed request: the translated `detail` of a known Problem Details code and wording,
 * the server `detail` for any other problem, and `fallback` for an error that is not an API problem.
 */
export function problemMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiProblem)) return fallback
  const key = problemKey(error.code, error.detail)
  return key ? i18n.t(`errors:${key}`) : error.detail
}
