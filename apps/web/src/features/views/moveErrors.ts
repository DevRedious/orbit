import { toast } from 'sonner'
import { isTaskVersionConflict } from '@/features/tasks/api/conflicts'
import { BulkTaskLimitError, MAX_BULK_TASK_UPDATES } from '@/features/tasks/api/tasks'
import { i18n } from '@/i18n'

/**
 * The one error path for drag-and-drop moves (list and board): a toast, except for version conflicts,
 * which the task mutations already answer with "Refresh task?" (and a refetch). Pass it as `onError`.
 */
export function reportMoveError(error: Error) {
  if (isTaskVersionConflict(error)) return
  toast.error(error instanceof BulkTaskLimitError
    ? i18n.t('views:grouping.moveTooLarge', { count: error.count, max: MAX_BULK_TASK_UPDATES })
    : i18n.t('views:grouping.moveFailed'))
}
