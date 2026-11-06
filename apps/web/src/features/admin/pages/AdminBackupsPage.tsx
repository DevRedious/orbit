import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FolderOpen, Trash } from 'reicon-react'
import type { BackupSummary } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useBackups, useCreateBackup, useDeleteBackup } from '@/features/admin/api'
import { BackupBrowseDialog } from '@/features/admin/components/BackupBrowseDialog'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import { formatSize } from '@/lib/attachmentLib'

/** Snapshots of the whole instance: every workspace, account and attachment. */
export function AdminBackupsPage() {
  const { t } = useTranslation('admin')
  const backups = useBackups()
  const backup = useCreateBackup()
  const remove = useDeleteBackup()
  const [browsing, setBrowsing] = useState<BackupSummary | null>(null)
  return (
    <SettingsCard
      title={t('backups.title')}
      description={t('backups.description')}
      actions={
        <Button disabled={backup.isPending} onClick={() => backup.mutate()}>
          {backup.isPending ? t('backups.creating') : t('backups.create')}
        </Button>
      }
      flush
    >
      <div className="flex flex-col divide-y text-[13px]">
        {backup.isError ? <SettingsRow role="alert"><span className="text-destructive">{problemMessage(backup.error, t('backups.failed'))}</span></SettingsRow> : null}
        {remove.isError ? <SettingsRow role="alert"><span className="text-destructive">{t('backups.deleteFailed')}</span></SettingsRow> : null}
        {backups.isError ? <SettingsRow role="alert">{t('backups.loadFailed')} <Button variant="ghost" onClick={() => void backups.refetch()}>{t('retry')}</Button></SettingsRow> : null}
        {backups.data?.length === 0 ? <SettingsRow className="text-muted-foreground">{t('backups.empty')}</SettingsRow> : null}
        {backups.data?.map((item) => <BackupRow key={item.id} backup={item} deleting={remove.isPending && remove.variables === item.id} onBrowse={() => setBrowsing(item)} onDelete={() => remove.mutate(item.id)} />)}
      </div>
      {browsing ? <BackupBrowseDialog backup={browsing} onClose={() => setBrowsing(null)} /> : null}
    </SettingsCard>
  )
}

function BackupRow({ backup, deleting, onBrowse, onDelete }: { backup: BackupSummary; deleting: boolean; onBrowse: () => void; onDelete: () => void }) {
  const { t } = useTranslation('admin')
  const created = new Date(backup.created_at)
  const date = created.toLocaleString(i18n.language)
  async function confirmDelete() {
    if (!await confirmAction({ title: t('backups.deleteTitle'), description: t('backups.deleteDescription', { date }), confirmLabel: t('delete'), danger: true })) return
    onDelete()
  }
  return (
    <SettingsRow className="flex-nowrap">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <time dateTime={created.toISOString()}>{date}</time>
          {backup.kind === 'pre_migration' ? <Badge variant="secondary">{t('backups.beforeUpgrade')}</Badge> : null}
          {backup.location === 's3' ? <Badge variant="secondary">S3</Badge> : null}
        </span>
        <span className="text-xs text-muted-foreground/70">
          {t('backups.summary', { size: formatSize(backup.byte_size), count: backup.file_count, version: backup.application_version })}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onBrowse} aria-label={t('backups.browseLabel', { date })}>
        <FolderOpen className="size-4" />
        {t('backups.browse')}
      </Button>
      <a
        href={`/api/v1/admin/backups/${encodeURIComponent(backup.id)}/download`}
        download
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
        aria-label={t('backups.downloadLabel', { date })}
      >
        <Download className="size-4" />
        {t('backups.download')}
      </a>
      <Button variant="outline" size="sm" disabled={deleting} onClick={() => void confirmDelete()} aria-label={t('backups.deleteLabel', { date })}>
        <Trash className="size-4" />
        {deleting ? t('deleting') : t('delete')}
      </Button>
    </SettingsRow>
  )
}
