import { useTranslation } from 'react-i18next'
import { Download } from 'reicon-react'
import { toast } from 'sonner'
import type { WorkspaceExport } from '@orbit/api/generated/types.gen'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { isActiveExport, useStartWorkspaceExport, useWorkspaceExports } from '@/features/settings/api/exports'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { formatSize } from '@/lib/attachmentLib'
import { problemMessage } from '@/i18n/problem'

/** A ZIP of the whole workspace (tasks, pages, chat and files) to download and keep. */
export function ExportPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const canExport = useCan('workspace.export')
  const exports = useWorkspaceExports(workspace.id, canExport)
  const start = useStartWorkspaceExport(workspace.id)
  if (!canExport) return <SettingsCard title={t('export.title')}><p className="m-0 text-muted-foreground">{t('export.ownersOnly')}</p></SettingsCard>
  const active = exports.data?.some(isActiveExport) ?? false
  return (
    <SettingsCard
      title={t('export.title')}
      description={t('export.description')}
      actions={
        <Button
          disabled={active || start.isPending || !exports.isSuccess}
          onClick={() => start.mutate(undefined, {
            onSuccess: () => toast(t('export.started')),
            onError: (error) => toast.error(problemMessage(error, t('export.startFailed'))),
          })}
        >
          {active ? t('export.inProgress') : t('export.start')}
        </Button>
      }
      flush
    >
      <div className="flex flex-col divide-y text-[13px]">
        {exports.isError ? <SettingsRow role="alert">{t('export.loadFailed')} <Button variant="ghost" onClick={() => void exports.refetch()}>{t('retry')}</Button></SettingsRow> : null}
        {exports.data?.length === 0 ? <SettingsRow className="text-muted-foreground">{t('export.empty')}</SettingsRow> : null}
        {exports.data?.map((item) => <ExportRow key={item.id} workspaceId={workspace.id} item={item} />)}
      </div>
    </SettingsCard>
  )
}

function ExportRow({ workspaceId, item }: { workspaceId: string; item: WorkspaceExport }) {
  const { t, i18n } = useTranslation('settings')
  const created = new Date(item.created_at).toLocaleString(i18n.language)
  const expires = new Date(item.expires_at).toLocaleString(i18n.language)
  return (
    <SettingsRow className="flex-nowrap">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium text-foreground">
          <time dateTime={item.created_at}>{created}</time>
        </span>
        {item.status === 'ready' ? (
          <span className="text-xs text-muted-foreground/70">{t('export.ready', { size: formatSize(item.size_bytes ?? 0), date: expires })}</span>
        ) : item.status === 'failed' ? (
          <span className="text-xs text-destructive">{t('export.failed')}</span>
        ) : (
          <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner role="presentation" aria-hidden aria-label={undefined} className="size-3.5" />
            {item.status === 'queued' ? t('export.queued') : t('export.running')}
          </span>
        )}
      </div>
      {item.status === 'ready' ? (
        <a
          href={`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/exports/${encodeURIComponent(item.id)}/download`}
          download
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          aria-label={t('export.downloadAria', { date: created })}
        >
          <Download className="size-4" />
          {t('export.download')}
        </a>
      ) : null}
    </SettingsRow>
  )
}
