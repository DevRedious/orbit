import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useMarkAllRead, useRestoreRead } from '@/features/chat/api/mutations'
import { UNDO_TOAST_DURATION } from '@/lib/toast'

/** "Mark all as read" for the Unreads view and `Shift+Esc`: every conversation and followed thread, with an Undo toast. */
export function useMarkAllReadWithUndo(): () => void {
  const { t } = useTranslation('chat')
  const markAllRead = useMarkAllRead()
  const restoreRead = useRestoreRead()
  return () => {
    if (markAllRead.isPending) return
    markAllRead.mutate(undefined, {
      onSuccess: (previous) => {
        toast(t('views.unreads.markedAllRead'), {
          duration: UNDO_TOAST_DURATION,
          action: {
            label: t('views.unreads.undo'),
            onClick: () => restoreRead.mutate(previous, { onError: () => void toast.error(t('views.unreads.undoFailed')) }),
          },
        })
      },
      onError: () => void toast.error(t('views.unreads.markAllReadFailed')),
    })
  }
}
