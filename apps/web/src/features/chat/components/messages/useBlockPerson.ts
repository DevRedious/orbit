import { toast } from 'sonner'
import { confirmAction } from '@/components/common/confirmAction'
import { i18n } from '@/i18n'
import { useBlockedIds, useSetBlocked } from '../../api/moderation'

/** Block and unblock, for the message menu and the profile popover. A block asks first; an unblock does not. */
export function useBlockPerson() {
  const blocked = useBlockedIds()
  const { mutate: setBlocked, isPending } = useSetBlocked()

  async function block(userId: string, name: string) {
    const confirmed = await confirmAction({
      title: i18n.t('chat:messages.block.title', { name }),
      description: i18n.t('chat:messages.block.description'),
      confirmLabel: i18n.t('chat:messages.block.confirm'),
      danger: true,
    })
    if (!confirmed) return
    setBlocked(
      { userId, blocked: true },
      { onSuccess: () => toast.success(i18n.t('chat:messages.block.blocked', { name })), onError: () => toast.error(i18n.t('chat:messages.block.blockFailed', { name })) },
    )
  }

  function unblock(userId: string, name: string) {
    setBlocked(
      { userId, blocked: false },
      { onSuccess: () => toast.success(i18n.t('chat:messages.block.unblocked', { name })), onError: () => toast.error(i18n.t('chat:messages.block.unblockFailed', { name })) },
    )
  }

  return { isBlocked: (userId: string) => blocked.has(userId), block, unblock, isPending }
}
