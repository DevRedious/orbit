import { useTranslation } from 'react-i18next'
import { UserBlock } from 'reicon-react'
import { EmptyState } from '@/components/common/EmptyState'
import { SettingsCard } from '@/components/common/SettingsCard'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { LoadingText } from '@/components/ui/spinner'
import { useChatBlocks } from '@/features/chat/api/moderation'
import { useBlockPerson } from '@/features/chat/components/messages/useBlockPerson'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { userColor } from '@/features/workspaces/api'
import { shortDate } from '@/lib/format'

/** Account view: the people the user blocked in chat, each with "Unblock". */
export function BlockedPeoplePage() {
  const { t } = useTranslation('settings')
  const blocks = useChatBlocks()
  const blocking = useBlockPerson()

  return (
    <SettingsCard title={t('blocked.title')} description={t('blocked.description')} flush>
      <div className="flex flex-col divide-y">
        {blocks.isPending ? <SettingsRow><LoadingText>{t('blocked.loading')}</LoadingText></SettingsRow> : null}
        {blocks.isError ? <SettingsRow role="alert">{t('blocked.loadFailed')} <Button variant="ghost" onClick={() => void blocks.refetch()}>{t('retry')}</Button></SettingsRow> : null}
        {blocks.data?.length === 0 ? (
          <EmptyState size="sm" icon={UserBlock} title={t('blocked.empty.title')} description={t('blocked.empty.description')} />
        ) : null}
        {blocks.data?.map((block) => (
          <SettingsRow key={block.user_id} className="flex-nowrap">
            <UserAvatar user={{ name: block.display_name, color: userColor(block.user_id), avatarUrl: block.avatar_url }} size={28} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[0.8125rem] font-medium text-foreground">{block.display_name}</span>
              <span className="text-xs text-muted-foreground/70">{t('blocked.since', { date: shortDate(block.created_at) })}</span>
            </div>
            <Button type="button" variant="ghost" aria-label={t('blocked.unblockNamed', { name: block.display_name })} disabled={blocking.isPending} onClick={() => blocking.unblock(block.user_id, block.display_name)}>
              {t('blocked.unblock')}
            </Button>
          </SettingsRow>
        ))}
      </div>
    </SettingsCard>
  )
}
