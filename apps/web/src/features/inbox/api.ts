import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  listNotifications,
  readAllNotifications,
  readNotification,
} from '@orbit/api/generated/sdk.gen'
import type { NotificationRecord } from '@orbit/api/generated/types.gen'
import { fetchAllPages } from '@/api/pagination'
import { i18n } from '@/i18n'
import { taskPath } from '@/lib/taskLinks'

function required<T>(data: T | undefined, message: string): T {
  if (data === undefined) throw new Error(message)
  return data
}

export function useNotifications(workspaceId: string, unread = false) {
  return useQuery({
    queryKey: queryKeys.notifications(workspaceId, unread),
    queryFn: async () => {
      const page = await fetchAllPages(async (cursor) => {
        const { data } = await listNotifications({
          client: apiClient,
          path: { workspace_id: workspaceId },
          query: { unread, cursor, limit: 100 },
          throwOnError: true,
        })
        return required(data, 'Notifications response was empty.')
      })
      return page.items
    },
  })
}

/** Whether the inbox has an unread notification: one row is enough to know. */
export function useHasUnreadNotifications(workspaceId: string) {
  return useQuery({
    // under the list's key, so what refreshes the inbox refreshes this
    queryKey: [...queryKeys.notifications(workspaceId, true), 'any'] as const,
    queryFn: async () => {
      const { data } = await listNotifications({
        client: apiClient,
        path: { workspace_id: workspaceId },
        query: { unread: true, limit: 1 },
        throwOnError: true,
      })
      return required(data, 'Notifications response was empty.').items.length > 0
    },
  })
}

export function useMarkNotificationRead(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await readNotification({
        client: apiClient,
        path: { workspace_id: workspaceId, notification_id: notificationId },
        throwOnError: true,
      })
      return required(data, 'Read notification response was empty.')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) })
    },
  })
}

export function useMarkAllNotificationsRead(workspaceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await readAllNotifications({
        client: apiClient,
        path: { workspace_id: workspaceId },
        throwOnError: true,
      })
      return required(data, 'Read-all response was empty.')
    },
    // Stay pending until the unread count refreshes, so the button does not re-enable for a moment.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) }),
  })
}

/** Where a notification leads: the task, the page with the comment thread open, the page at the mention, or the chat message. */
export function notificationTarget(notification: NotificationRecord): string | null {
  if (notification.kind === 'chat_mentioned' && notification.chat_conversation_id) {
    const message = notification.chat_message_id ? `?m=${encodeURIComponent(notification.chat_message_id)}` : ''
    return `/chat/${notification.chat_conversation_id}${message}`
  }
  if (notification.kind === 'page_mentioned' && notification.page_id) {
    const block = notification.page_block_id ? `?block=${encodeURIComponent(notification.page_block_id)}` : ''
    return `/docs/${notification.page_id}${block}`
  }
  if (notification.kind === 'page_comment_mentioned' && notification.page_id) {
    const thread = notification.page_thread_id ? `?thread=${encodeURIComponent(notification.page_thread_id)}` : ''
    return `/docs/${notification.page_id}${thread}`
  }
  // the task page replaces the id with the identifier once the task loads
  return notification.task_id ? taskPath({ id: notification.task_id }) : null
}

/** Mentions in task comments and descriptions, page comments, page bodies and chat. */
export function isMention(notification: NotificationRecord): boolean {
  return ['comment_mentioned', 'description_mentioned', 'page_comment_mentioned', 'page_mentioned', 'chat_mentioned'].includes(
    notification.kind,
  )
}

/** The title and body of a notification, in the UI language. */
export function notificationCopy(notification: NotificationRecord, pageTitle?: string, actorName?: string): { title: string; body: string } {
  const t = i18n.getFixedT(null, 'shell', 'notification')
  const actor = actorName ?? t('someone')
  const page = () => (pageTitle === undefined ? t('aPage') : t('quotedPage', { title: pageTitle.trim() || t('untitled') }))
  if (notification.kind === 'chat_mentioned') {
    return { title: t('chatMentionedTitle', { actor }), body: t('chatMentionedBody') }
  }
  if (notification.kind === 'page_mentioned') {
    return { title: t('pageMentionedTitle', { actor, page: page() }), body: t('pageMentionedBody') }
  }
  if (notification.kind === 'page_comment_mentioned') {
    return { title: t('pageCommentMentionedTitle'), body: t('pageCommentMentionedBody', { page: page() }) }
  }
  if (notification.kind === 'comment_mentioned') {
    return { title: t('mentionedTitle'), body: t('commentMentionedBody') }
  }
  if (notification.kind === 'description_mentioned') {
    return { title: t('mentionedTitle'), body: t('descriptionMentionedBody') }
  }
  return { title: t('assignedTitle'), body: t('assignedBody') }
}
