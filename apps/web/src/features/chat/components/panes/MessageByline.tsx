import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/common/UserAvatar'
import type { Message } from '@/features/chat/api/types'
import { fullTimestamp, relativeAgo } from '@/features/chat/lib/time'
import type { User } from '@/features/workspaces/models'
import { ProfileTrigger } from '@/components/common/ProfileTrigger'

interface MessageBylineProps {
  message: Pick<Message, 'authorId' | 'createdAt'>
  members: readonly User[]
  /** After the time, for example the conversation of a search result. */
  children?: ReactNode
  /** The avatar and the name open the author's profile. Off where the byline is inside a button (a search result). */
  profile?: boolean
}

/**
 * Who wrote a message and when: small avatar, neutral name, muted time. Without `profile` it is spans only, so it can
 * sit inside a button.
 */
export function MessageByline({ message, members, children, profile = false }: MessageBylineProps) {
  const { t } = useTranslation('chat')
  const author = members.find((member) => member.id === message.authorId)
  const name = author?.name ?? t('panes.unknownAuthor')
  return (
    <span data-slot="message-byline" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <ProfileTrigger userId={profile ? author?.id : null} name={name} kind="avatar" tabIndex={-1} className="flex shrink-0">
        <UserAvatar user={author} name="?" size={20} />
      </ProfileTrigger>
      <ProfileTrigger userId={profile ? author?.id : null} name={name} className="truncate font-medium text-foreground">
        {name}
      </ProfileTrigger>
      <time dateTime={new Date(message.createdAt).toISOString()} title={fullTimestamp(message.createdAt)} className="shrink-0 text-xs font-normal text-muted-foreground">
        {relativeAgo(message.createdAt)}
      </time>
      {children}
    </span>
  )
}
