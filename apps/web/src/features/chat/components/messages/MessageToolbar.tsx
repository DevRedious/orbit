import { useTranslation } from 'react-i18next'
import { Forward, Message as MessageIcon, MoreH, Reply, SmileCircle } from 'reicon-react'
import { Emoji } from '@/components/common/Emoji'
import { Tip } from '@/components/common/Tip'
import { Button } from '@/components/ui/button'
import type { Message } from '../../api/types'
import { useMessageList } from './messageListContext'

/**
 * The hover toolbar: three quick reactions, the emoji picker, reply, reply in thread, forward, and `…`. It sits at the right edge of
 * the row, as in Discord, so it is in the same place for every message and does not cover the text. It shows on hover
 * (fine pointers), while the row or something in it has keyboard focus, and while its menu or picker is open; never
 * on a phone, where a long press opens the action sheet. No animation.
 */
export function MessageToolbar({ message }: { message: Message }) {
  const { t } = useTranslation('chat')
  const { inThread, quickEmojis, react, reply, openThread, forward, openMenu, openPicker } = useMessageList()
  return (
    <div
      role="toolbar"
      aria-label={t('messages.toolbar.label')}
      data-slot="message-toolbar"
      className="absolute -top-5 right-4 z-10 hidden items-center gap-0.5 rounded-lg border border-border bg-background p-0.5 shadow-sm group-focus-visible/message:flex group-has-[:focus-visible]/message:flex group-data-menu-open/message:flex hover-fine:group-hover/message:flex max-[899px]:hidden!"
    >
      {quickEmojis.map((emoji) => (
        <Button key={emoji} variant="ghost" size="icon" className="text-base" aria-label={t('messages.toolbar.reactWith', { emoji })} onClick={() => react(message, emoji)}>
          <Emoji value={emoji} />
        </Button>
      ))}
      <Tip label={t('messages.toolbar.addReaction')}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('messages.toolbar.addReaction')}
          aria-haspopup="dialog"
          onClick={(event) => openPicker(message, event.currentTarget, 'end')}
        >
          <SmileCircle className="size-5" />
        </Button>
      </Tip>
      {reply ? (
        <Tip label={t('messages.toolbar.reply')}>
          <Button variant="ghost" size="icon" aria-label={t('messages.toolbar.reply')} onClick={() => reply(message)}>
            <Reply className="size-5" />
          </Button>
        </Tip>
      ) : null}
      {inThread ? null : (
        <Tip label={t('messages.toolbar.replyInThread')}>
          <Button variant="ghost" size="icon" aria-label={t('messages.toolbar.replyInThread')} onClick={() => openThread(message)}>
            <MessageIcon className="size-5" />
          </Button>
        </Tip>
      )}
      <Tip label={t('messages.toolbar.forward')}>
        <Button variant="ghost" size="icon" aria-label={t('messages.toolbar.forward')} aria-haspopup="dialog" onClick={() => forward(message)}>
          <Forward className="size-5" />
        </Button>
      </Tip>
      <Tip label={t('messages.toolbar.moreActions')}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('messages.toolbar.moreActions')}
          aria-haspopup="menu"
          onClick={(event) => openMenu(message, event.currentTarget, 'end')}
        >
          <MoreH className="size-5" />
        </Button>
      </Tip>
    </div>
  )
}
