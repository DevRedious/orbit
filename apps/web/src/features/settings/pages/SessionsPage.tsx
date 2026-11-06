import { useTranslation } from 'react-i18next'
import { Monitor, Mobile as Smartphone } from 'reicon-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/format'
import { SessionRevocationError, SIGNED_IN_DEVICE, useRevokeSessions, useSessions } from '@/features/settings/api/sessions'
import { SettingsCard } from '@/components/common/SettingsCard'
import { useSlowPending } from '@/lib/useDebouncedValue'
import { RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'

/** Account view: the current user's signed-in devices. */
export function SessionsPage() {
  const { t } = useTranslation('settings')
  const sessionsQuery = useSessions()
  const revokeSessions = useRevokeSessions()
  const revoking = useSlowPending(revokeSessions.isPending)
  const sessions = sessionsQuery.data ?? []
  const others = sessions.filter((s) => !s.current)
  const failure = revokeSessions.error instanceof SessionRevocationError ? revokeSessions.error : null

  return (
    <>
      <SettingsCard
        title={t('sessions.title')}
        description={t('sessions.description')}
        actions={
          others.length > 0 ? (
            <Button type="button" variant="outline" disabled={revokeSessions.isPending} onClick={() => revokeSessions.mutate(others.map((session) => session.id))}>
              {t('sessions.signOutOthers')}
            </Button>
          ) : undefined
        }
        flush
      >
        <div className="flex flex-col divide-y">
          {sessionsQuery.isPending ? <SettingsRow>{t('sessions.loading')}</SettingsRow> : null}
          {sessionsQuery.isError ? <SettingsRow role="alert">{t('sessions.loadFailed')} <Button variant="ghost" onClick={() => void sessionsQuery.refetch()}>{t('retry')}</Button></SettingsRow> : null}
          {sessions.map((session) => {
            return (
              <SettingsRow key={session.id} className="flex-nowrap">
                <RowIcon>
                  {session.device.toLowerCase().includes('iphone') || session.device.toLowerCase().includes('android') ? <Smartphone /> : <Monitor />}
                </RowIcon>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    {session.device === SIGNED_IN_DEVICE ? t('sessions.device') : session.device} · {session.browser}
                    {session.current ? <Badge>{t('sessions.current')}</Badge> : null}
                  </span>
                  <span className="text-xs text-muted-foreground/70">{t('sessions.lastActive', { time: relativeTime(session.last_activity_at) })}</span>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Avatar size="sm" className="size-7">
                    <AvatarFallback className="rounded-lg text-[11px] font-semibold">{session.user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {session.user.display_name}
                </span>
                {!session.current ? (
                  <Button type="button" variant="ghost" disabled={revokeSessions.isPending} onClick={() => revokeSessions.mutate([session.id])}>
                    {t('revoke')}
                  </Button>
                ) : null}
              </SettingsRow>
            )
          })}
          {revokeSessions.isError ? <SettingsRow role="alert">{failure ? t('sessions.partialFailure', { failed: failure.failedIds.length, total: failure.total }) : t('sessions.revokeFailed')} <Button variant="ghost" onClick={() => revokeSessions.mutate(failure?.failedIds ?? revokeSessions.variables ?? [])}>{failure ? t('sessions.retryFailed') : t('retry')}</Button></SettingsRow> : null}
          {revoking ? <SettingsRow role="status">{t('sessions.revoking', { count: revokeSessions.variables?.length ?? 1 })}</SettingsRow> : null}
        </div>
      </SettingsCard>
    </>
  )
}
