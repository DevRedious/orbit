import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PinTack } from 'reicon-react'
import { Button } from '@/components/ui/button'
import { useChatContext } from '@/features/chat/api/chatContext'
import { useSetPinned } from '@/features/chat/api/mutations'
import { useConversation, usePins } from '@/features/chat/api/queries'
import type { Message } from '@/features/chat/api/types'
import { chatErrorMessage } from '@/features/chat/components/dialogs/channelLib'
import { MessageBody } from '@/features/chat/components/messages/MessageBody'
import { useMembers } from '@/features/workspaces/api'
import { MessageByline } from './MessageByline'
import { RightPane, RightPaneBody, RightPaneEmpty, RightPaneError, RightPaneLoading } from './RightPane'
import { useJumpToMessage } from './useJumpToMessage'

/** The pinned messages of a conversation, newest first. */
export function PinsPane({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation('chat')
  const { workspaceId } = useChatContext()
  const pins = usePins(conversationId)
  const conversation = useConversation(conversationId).data
  const members = useMembers(workspaceId).data ?? []
  const setPinned = useSetPinned()
  const jump = useJumpToMessage()
  // a reader of a public channel who has not joined can look, but not change the pins
  const canUnpin = Boolean(conversation?.isMember && !conversation.archived)

  const unpin = (message: Message) => {
    setPinned.mutate(
      { message, pinned: false },
      { onError: (error) => toast.error(chatErrorMessage(error, t('panes.pins.unpinFailed'), { forbidden: t('panes.pins.unpinForbidden') })) },
    )
  }

  return (
    <RightPane title={t('panes.pins.title')}>
      <RightPaneBody>
        {pins.isPending ? (
          <RightPaneLoading />
        ) : pins.isError ? (
          <RightPaneError title={t('panes.pins.loadFailed')} onRetry={() => void pins.refetch()} />
        ) : pins.data.length === 0 ? (
          <RightPaneEmpty icon={PinTack} title={t('panes.pins.emptyTitle')} description={t('panes.pins.emptyDescription')} />
        ) : (
          <ul aria-label={t('panes.pins.title')} className="flex flex-col gap-1">
            {pins.data.map((message) => (
              <li key={message.id} className="flex flex-col gap-1 rounded-lg p-2 hover-fine:hover:bg-muted/50">
                <MessageByline message={message} members={members} profile />
                <MessageBody message={message} />
                <div className="-ml-2 flex items-center gap-1">
                  <Button variant="ghost" size="xs" onClick={() => jump(message)}>
                    {t('panes.pins.jump')}
                  </Button>
                  {canUnpin ? (
                    <Button variant="ghost" size="xs" onClick={() => unpin(message)}>
                      {t('panes.pins.unpin')}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </RightPaneBody>
    </RightPane>
  )
}
