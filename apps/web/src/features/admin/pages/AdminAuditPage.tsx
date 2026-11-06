import { useTranslation } from 'react-i18next'
import { Download } from 'reicon-react'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useGlobalAudit } from '@/features/admin/api'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'

/** Security events of every workspace and of the instance, newest first. */
export function AdminAuditPage() {
  const { t } = useTranslation('admin')
  const audit = useGlobalAudit()
  return (
    <SettingsCard
      title={t('audit.title')}
      description={t('audit.description')}
      actions={
        <a href="/api/v1/admin/audit/export" download="orbit-audit.csv" className={buttonVariants({ variant: 'outline' })}>
          <Download className="size-4" />
          {t('audit.export')}
        </a>
      }
      flush
    >
      <div className="flex flex-col divide-y text-[13px]">
        {audit.isPending ? <SettingsRow role="status">{t('audit.loading')}</SettingsRow> : null}
        {audit.isError ? <SettingsRow role="alert">{t('audit.failed')} <Button variant="ghost" onClick={() => void audit.refetch()}>{t('retry')}</Button></SettingsRow> : null}
        {audit.data?.length === 0 ? <SettingsRow className="text-muted-foreground">{t('audit.empty')}</SettingsRow> : null}
        {audit.data?.map((event) => {
          const occurred = new Date(event.occurred_at)
          return (
            <SettingsRow key={event.id} className="flex-nowrap">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                  <span className="truncate font-mono text-xs">{event.action}</span>
                  {event.outcome === 'failure' ? <Badge variant="destructive">{t('audit.failedBadge')}</Badge> : null}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {event.actor_id ? (event.actor_name ?? t('audit.unknownAccount')) : t('audit.system')}
                </span>
              </div>
              <time dateTime={event.occurred_at} className="shrink-0 text-xs text-muted-foreground/70">{occurred.toLocaleString(i18n.language)}</time>
            </SettingsRow>
          )
        })}
        {audit.hasNextPage ? (
          <SettingsRow className="justify-center">
            <Button variant="ghost" disabled={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>
              {audit.isFetchingNextPage ? t('audit.loadingMore') : t('audit.loadOlder')}
            </Button>
          </SettingsRow>
        ) : null}
      </div>
    </SettingsCard>
  )
}
