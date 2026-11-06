import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useChatContext } from '../../api/chatContext'
import type { Conversation } from '../../api/types'
import { isSelfDm } from '../../lib/sidebar'
import { fullTimestamp } from '../../lib/time'
import { useChatNavigation, useOpenPane } from '../../useChatNavigation'
import { conversationTitle, useChatPeople } from './people'
import { ProfileTrigger } from '@/components/common/ProfileTrigger'

/** The block above the first message of a conversation. */
export function ConversationStart({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation('chat')
  const { currentUserId } = useChatContext()
  const people = useChatPeople()
  const { togglePane } = useChatNavigation()
  const title = conversationTitle(conversation, people, currentUserId)
  const membersOpen = useOpenPane() === 'members'

  if (isSelfDm(conversation)) {
    return (
      <div data-slot="conversation-start" className="flex flex-col items-start gap-1 px-4 pt-8 pb-4 max-[899px]:px-3">
        <p className="text-base font-semibold">{t('messages.start.selfTitle')}</p>
        <p className="max-w-[90ch] text-sm text-muted-foreground">{t('messages.start.selfBody')}</p>
      </div>
    )
  }

  if (conversation.kind === 'dm') {
    return (
      <div data-slot="conversation-start" className="px-4 pt-8 pb-4 max-[899px]:px-3">
        <p className="text-base font-semibold">{t('messages.start.dmTitle', { title })}</p>
      </div>
    )
  }

  const creator = people.byId.get(conversation.createdBy)
  return (
    <div data-slot="conversation-start" className="flex flex-col items-start gap-1 px-4 pt-8 pb-4 max-[899px]:px-3">
      <p className="text-base font-semibold">{t('messages.start.channelTitle', { title })}</p>
      {conversation.topic ? <p className="max-w-[90ch] text-sm text-muted-foreground">{conversation.topic}</p> : null}
      <p className="text-xs text-muted-foreground">
        {creator ? (
          <Trans
            t={t}
            i18nKey="messages.start.createdBy"
            values={{ name: creator.name, date: fullTimestamp(conversation.createdAt) }}
            components={{ creator: <ProfileTrigger userId={creator.id} name={creator.name} className="font-medium text-foreground/85" /> }}
          />
        ) : (
          t('messages.start.createdOn', { date: fullTimestamp(conversation.createdAt) })
        )}
      </p>
      {conversation.isMember && !conversation.archived && !membersOpen ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={() => togglePane('members')}>
          {t('messages.start.addPeople')}
        </Button>
      ) : null}
    </div>
  )
}
