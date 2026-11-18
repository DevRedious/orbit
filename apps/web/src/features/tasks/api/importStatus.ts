import { i18n } from '@/i18n'
import type { AsanaImportStatus, LinearImportStatus, TrelloImportStatus } from '@orbit/api/generated/types.gen'

/** The states every task import (Asana, Linear, Trello) goes through. */
export type TaskImportStatus = AsanaImportStatus | LinearImportStatus | TrelloImportStatus

/** How often an import that is still working is polled. */
export const IMPORT_POLL_MS = 2000

/** A job is working on it: poll. */
export function isActiveImport(status: TaskImportStatus | undefined): boolean {
  return status === 'scanning' || status === 'queued' || status === 'importing'
}

/** Nothing will change any more. */
export function isFinalImport(status: TaskImportStatus | undefined): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'expired'
}

/** Getters: each read follows the UI language. */
export const IMPORT_STATUS_LABELS: Record<TaskImportStatus, string> = {
  get scanning() { return i18n.t('tasks:import.common.status.scanning') },
  get ready() { return i18n.t('tasks:import.common.status.ready') },
  get queued() { return i18n.t('tasks:import.common.status.queued') },
  get importing() { return i18n.t('tasks:import.common.status.importing') },
  get completed() { return i18n.t('tasks:import.common.status.completed') },
  get failed() { return i18n.t('tasks:import.common.status.failed') },
  get cancelled() { return i18n.t('tasks:import.common.status.cancelled') },
  get expired() { return i18n.t('tasks:import.common.status.expired') },
}

/** The badge variant of an import status. */
export function importStatusVariant(status: TaskImportStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') return 'destructive'
  if (status === 'completed') return 'secondary'
  if (isActiveImport(status) || status === 'ready') return 'default'
  return 'outline'
}
