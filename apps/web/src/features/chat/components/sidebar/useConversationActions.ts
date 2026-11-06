import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { confirmAction } from '@/components/common/confirmAction'
import { useChatContext } from '@/features/chat/api/chatContext'
import { useArchiveChannel, useLeaveChannel, useMarkRead, useSetFavorite, useSetNotify } from '@/features/chat/api/mutations'
import { useConversationState } from '@/features/chat/api/queries'
import type { Conversation, NotifyLevel } from '@/features/chat/api/types'
import { conversationPath } from '@/features/chat/chatRoutes'
import { useMembers } from '@/features/workspaces/api'

/** The current user is a workspace owner or admin: they manage every channel and the shared categories. */
export function useIsChatAdmin(): boolean {
  const { workspaceId, currentUserId } = useChatContext()
  const role = useMembers(workspaceId).data?.find((member) => member.id === currentUserId)?.role
  return role === 'Owner' || role === 'Admin'
}

/**
 * What the row menu and the header menu can do with a conversation, and whether the user may. Write errors show a
 * toast with the action's name; the optimistic change rolls back in the mutation.
 */
export function useConversationActions(conversation: Conversation) {
  const { t } = useTranslation('chat')
  const { currentUserId } = useChatContext()
  const admin = useIsChatAdmin()
  const state = useConversationState(conversation.id).data
  const markRead = useMarkRead()
  const setFavorite = useSetFavorite()
  const setNotify = useSetNotify()
  const leaveChannel = useLeaveChannel()
  const archiveChannel = useArchiveChannel()

  const id = conversation.id
  const channel = conversation.kind !== 'dm'
  const canManage = channel && !conversation.archived && (admin || conversation.createdBy === currentUserId)
  const failed = (message: string) => () => void toast.error(message)

  return {
    state,
    /** Edit the channel. */
    canManage,
    canArchive: canManage && !conversation.isDefault,
    // every workspace member is in a public channel (#general too): only a private one can be left
    canLeave: conversation.kind === 'private' && conversation.isMember,
    markRead: () => markRead.mutate(id, { onError: failed(t('sidebar.actions.markReadFailed')) }),
    toggleFavorite: () =>
      setFavorite.mutate(
        { conversationId: id, favorite: !state?.favorite },
        { onError: failed(state?.favorite ? t('sidebar.actions.removeStarFailed') : t('sidebar.actions.addStarFailed')) },
      ),
    setNotify: (notify: NotifyLevel) => setNotify.mutate({ conversationId: id, notify }, { onError: failed(t('sidebar.actions.notifyFailed')) }),
    copyLink: () => {
      navigator.clipboard
        .writeText(`${window.location.origin}${conversationPath(id)}`)
        .then(() => toast.success(t('sidebar.actions.linkCopied')))
        .catch(failed(t('sidebar.actions.copyLinkFailed')))
    },
    leave: async () => {
      // leaving a private channel removes it for the user: they need an invitation to come back
      if (conversation.kind === 'private') {
        const confirmed = await confirmAction({
          title: t('sidebar.actions.leaveTitle', { name: conversation.name }),
          description: t('sidebar.actions.leaveDescription'),
          confirmLabel: t('sidebar.menu.leaveChannel'),
          danger: true,
        })
        if (!confirmed) return
      }
      leaveChannel.mutate(id, { onError: failed(t('sidebar.actions.leaveFailed')) })
    },
    archive: async () => {
      const confirmed = await confirmAction({
        title: t('sidebar.actions.archiveTitle', { name: conversation.name }),
        description: t('sidebar.actions.archiveDescription'),
        confirmLabel: t('sidebar.menu.archiveChannel'),
        danger: true,
      })
      if (confirmed) archiveChannel.mutate(id, { onError: failed(t('sidebar.actions.archiveFailed')) })
    },
  }
}

export type ConversationActions = ReturnType<typeof useConversationActions>
