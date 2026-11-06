import type { CollabState } from '@orbit/editor/collab/session'
import { i18n } from '@/i18n'

const STATUS_KEY = {
  live: 'collabStatus.live',
  connecting: 'collabStatus.connecting',
  reset: 'collabStatus.connecting',
  offline: 'collabStatus.offline',
  lost: 'collabStatus.lost',
  error: 'collabStatus.error',
} as const satisfies Record<CollabState['status'], string>

/** The collaboration status in the UI language; `collabStatusLabel` in `@orbit/editor` stays the English one for mobile. */
export function collabStatusText(status: CollabState['status']): string {
  return i18n.t(`docs:${STATUS_KEY[status]}`)
}
