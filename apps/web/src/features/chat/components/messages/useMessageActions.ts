import type { ComponentProps } from 'react'
import {
  Copy,
  Edit,
  Forward,
  Link2,
  Message as MessageIcon,
  Pin,
  PinOff,
  Reply,
  SmileCircle,
  TaskSquare,
  Trash,
  Unread,
  type IconComponent,
} from 'reicon-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { confirmAction } from '@/components/common/confirmAction'
import type { DropdownMenuContent } from '@/components/ui/dropdown-menu'
import { useChatContext } from '../../api/chatContext'
import { useDeleteMessage, useMarkUnread, useSetPinned, useToggleReaction } from '../../api/mutations'
import type { Message } from '../../api/types'
import { useChatHost } from '../../chatHost'
import { messagePath } from '../../chatRoutes'
import { canEdit, canForward } from '../../lib/forward'
import { decodeMentions } from '../../lib/mentionTokens'
import { useChatNavigation } from '../../useChatNavigation'
import { useChatPeople } from './people'

export type MenuAnchor = NonNullable<ComponentProps<typeof DropdownMenuContent>['anchor']>

/** A zero-size anchor at the pointer, so a right-click menu opens with its corner at the click. */
export function pointAnchor(x: number, y: number): MenuAnchor {
  return { getBoundingClientRect: () => DOMRect.fromRect({ x, y, width: 0, height: 0 }) }
}

export interface MessageAction {
  key: string
  label: string
  icon: IconComponent
  destructive?: boolean
  run: () => void
}

interface MessageActionOptions {
  /** In a thread there is no "Reply in Thread". */
  inThread: boolean
  /** Makes the message the composer's reply target. Absent where the user cannot write: no "Reply" then. */
  onReply?: (message: Message) => void
  /** Opens the forward dialog for the message. */
  onForward: (message: Message) => void
  onAddReaction: (message: Message) => void
  onEdit: (message: Message) => void
  /** Called before "Mark as unread" is sent, so the view stops marking itself read before the new state arrives. */
  onMarkUnread?: (message: Message) => void
}

/**
 * What a member can do with a message. The `…` menu, the right-click menu and the mobile action sheet all show
 * `actionsFor(message)`, so they never differ.
 */
export function useMessageActions({ inThread, onReply, onForward, onAddReaction, onEdit, onMarkUnread }: MessageActionOptions) {
  const { t } = useTranslation('chat')
  const { currentUserId } = useChatContext()
  const people = useChatPeople()
  const host = useChatHost()
  const { openConversation, openThreadPane, showInThread } = useChatNavigation()
  const { mutate: toggleReaction } = useToggleReaction()
  const { mutate: setPinned } = useSetPinned()
  const { mutate: markUnread } = useMarkUnread()
  const { mutate: deleteMessage } = useDeleteMessage()
  const role = currentUserId ? people.byId.get(currentUserId)?.role : undefined
  const moderator = role === 'Owner' || role === 'Admin'

  function react(message: Message, emoji: string) {
    toggleReaction({ message, emoji }, { onError: () => toast.error(t('messages.actions.reactionFailed')) })
  }

  /** Opens the thread of a root, or the thread a reply belongs to (at that reply). */
  function openThread(message: Message) {
    if (message.threadRootId) openThreadPane(message.conversationId, message.threadRootId, message.id)
    else openThreadPane(message.conversationId, message.id)
  }

  /** Jumps to the message that a reply quotes: in the open thread for one of its replies, else in the conversation. */
  function openQuoted(message: Message) {
    if (!message.replyToId) return
    if (inThread && message.threadRootId) showInThread(message.threadRootId, message.replyToId)
    else openConversation(message.conversationId, message.replyToId)
  }

  /** Jumps to the message that a forward is a copy of, in its own conversation. */
  function openOrigin(message: Message) {
    if (message.forwarded) openConversation(message.forwarded.conversationId, message.forwarded.messageId)
  }

  function copy(text: string, done: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(done),
      () => toast.error(t('messages.actions.copyFailed')),
    )
  }

  async function remove(message: Message) {
    const confirmed = await confirmAction({
      title: t('messages.actions.deleteTitle'),
      description: message.replyCount > 0 ? t('messages.actions.deleteWithReplies') : t('messages.actions.deleteDescription'),
      confirmLabel: t('messages.actions.deleteConfirm'),
      danger: true,
    })
    if (confirmed) deleteMessage(message.id, { onError: () => toast.error(t('messages.actions.deleteFailed')) })
  }

  function actionsFor(message: Message): MessageAction[] {
    // A message the server has not confirmed has no id to act on; its row offers retry and delete instead.
    if (message.sendState || message.kind !== 'message') return []
    const own = message.authorId === currentUserId
    const actions: MessageAction[] = []
    if (!message.deleted) {
      actions.push({ key: 'react', label: t('messages.actions.addReaction'), icon: SmileCircle, run: () => onAddReaction(message) })
    }
    if (onReply && !message.deleted) {
      actions.push({ key: 'reply', label: t('messages.actions.reply'), icon: Reply, run: () => onReply(message) })
    }
    if (!inThread) {
      actions.push({ key: 'thread', label: t('messages.actions.replyInThread'), icon: MessageIcon, run: () => openThread(message) })
    }
    if (canForward(message)) {
      actions.push({ key: 'forward', label: t('messages.actions.forward'), icon: Forward, run: () => onForward(message) })
    }
    actions.push({
      key: 'link',
      label: t('messages.actions.copyLink'),
      icon: Link2,
      run: () => copy(`${window.location.origin}${messagePath(message)}`, t('messages.actions.linkCopied')),
    })
    if (message.deleted) return actions
    actions.push(
      {
        key: 'text',
        label: t('messages.actions.copyText'),
        icon: Copy,
        run: () => copy(decodeMentions(message.body, people.members, people.channels), t('messages.actions.textCopied')),
      },
      { key: 'task', label: t('messages.actions.createTask'), icon: TaskSquare, run: () => host.createTask(message) },
      {
        key: 'pin',
        label: message.pinned ? t('messages.actions.unpin') : t('messages.actions.pin'),
        icon: message.pinned ? PinOff : Pin,
        run: () =>
          setPinned(
            { message, pinned: !message.pinned },
            { onError: () => toast.error(message.pinned ? t('messages.actions.unpinFailed') : t('messages.actions.pinFailed')) },
          ),
      },
      {
        key: 'unread',
        label: t('messages.actions.markUnread'),
        icon: Unread,
        run: () => {
          onMarkUnread?.(message)
          markUnread(message.id, { onError: () => toast.error(t('messages.actions.markUnreadFailed')) })
        },
      },
    )
    if (canEdit(message, currentUserId)) actions.push({ key: 'edit', label: t('messages.actions.edit'), icon: Edit, run: () => onEdit(message) })
    if (own || moderator) {
      actions.push({ key: 'delete', label: t('messages.actions.delete'), icon: Trash, destructive: true, run: () => void remove(message) })
    }
    return actions
  }

  return { actionsFor, react, openThread, openQuoted, openOrigin }
}
