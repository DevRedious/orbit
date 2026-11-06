import { ApiProblem } from '@orbit/api/problem'
import { i18n } from '@/i18n'

export function taskUnavailableDescription(error: unknown): string {
  if (error instanceof ApiProblem && error.status === 404) {
    return i18n.t('tasks:availability.notFound')
  }

  return i18n.t('tasks:availability.failed')
}
