import { Trans, useTranslation } from 'react-i18next'
import type { Message } from '../../api/types'
import { dayChip, fullTimestamp, messageTime } from '../../lib/time'
import { useMessageList } from './messageListContext'
import { replyCountLabel } from './messageText'

/** The date between two days. While its day scrolls, the list shows the same chip at its top. */
export function DayChip({ at }: { at: number }) {
  return (
    <div role="separator" aria-label={dayChip(at)} data-slot="day-chip" className="pointer-events-none flex justify-center py-2">
      <span className="rounded-full border border-border bg-background px-3 py-0.5 text-xs font-medium text-muted-foreground">{dayChip(at)}</span>
    </div>
  )
}

/**
 * Where the unread messages start: a pink hairline, "New", and the pink square at its start (one of the three places
 * the square shows).
 */
export function NewLine() {
  const { t } = useTranslation('chat')
  return (
    <div role="separator" aria-label={t('messages.rows.newMessages')} data-slot="new-line" className="flex items-center gap-2 px-4 py-1">
      <span data-slot="unread-marker" aria-hidden="true" className="size-1.5 shrink-0 bg-primary" />
      <span className="text-xs font-semibold text-primary">{t('messages.rows.new')}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-primary" />
    </div>
  )
}

/** Between the root of a thread and its replies. */
export function RepliesDivider({ count }: { count: number }) {
  return (
    <div role="separator" aria-label={replyCountLabel(count)} data-slot="replies-divider" className="flex items-center gap-3 px-4 py-2">
      <span className="text-xs font-medium text-muted-foreground">{replyCountLabel(count)}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

const SYSTEM_TEXT = {
  pin: 'messages.rows.system.pin',
  join: 'messages.rows.system.join',
  leave: 'messages.rows.system.leave',
} as const satisfies Record<Exclude<Message['kind'], 'message'>, string>

/** A pin, join or leave: one muted line. */
export function SystemRow({ message }: { message: Message }) {
  const { t } = useTranslation('chat')
  const { people } = useMessageList()
  if (message.kind === 'message') return null
  return (
    <div role="listitem" data-slot="system-message" data-kind={message.kind} className="px-4 py-1 text-xs text-muted-foreground">
      <Trans
        t={t}
        i18nKey={SYSTEM_TEXT[message.kind]}
        values={{ name: people.byId.get(message.authorId)?.name ?? t('messages.someone') }}
        components={{ author: <span className="font-medium text-foreground/80" /> }}
      />
      <time dateTime={new Date(message.createdAt).toISOString()} title={fullTimestamp(message.createdAt)} className="ml-2">
        {messageTime(message.createdAt)}
      </time>
    </div>
  )
}
