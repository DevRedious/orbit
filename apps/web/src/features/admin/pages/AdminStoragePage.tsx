import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { BackupSchedule, CompressionStatus, EnvironmentView, S3View, StorageView } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { InfoTip } from '@/components/common/InfoTip'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingText, Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useInstanceSettings, useRemoveS3, useSaveS3, useSaveStorageOptions, useStartImageCompression } from '@/features/admin/api'
import { SetByEnvironment } from '@/features/admin/components/SetByEnvironment'
import { S3BucketForm } from '@/features/settings/components/S3BucketForm'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import { formatSize } from '@/lib/attachmentLib'

// Their labels are `admin:storage.schedule.<value>` keys.
const SCHEDULES: BackupSchedule[] = ['off', 'hourly', 'daily']

const KEEP_DELETED_DAYS = [1, 7, 14, 30, 40, 90, 180, 365]

function daysLabel(days: number) {
  return days === 1 ? '1 day' : `${days} days`
}

/** Where attachments and backups are stored: this server's disk or an S3 bucket, and automatic backups. */
export function AdminStoragePage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('storage.title')}><p><LoadingText>{t('loadingSettings')}</LoadingText></p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('storage.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  const { storage, environment } = settings.data
  return (
    <>
      {/* Remount on save so the form shows what the server stored. */}
      <BucketCard key={JSON.stringify(storage.s3)} s3={storage.s3 ?? null} locked={environment.s3} />
      <UsageCard storage={storage} environment={environment} />
      {storage.image_compression ? <ImagesCard status={storage.image_compression} /> : null}
    </>
  )
}

function BucketCard({ s3, locked }: { s3: S3View | null; locked: boolean }) {
  const { t } = useTranslation('admin')
  const save = useSaveS3()
  const remove = useRemoveS3()

  async function removeBucket() {
    const confirmed = await confirmAction({
      title: t('storage.bucket.removeTitle'),
      description: t('storage.bucket.removeDescription'),
      confirmLabel: t('remove'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(undefined, {
      onSuccess: () => toast(i18n.t('admin:storage.bucket.removed')),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:storage.bucket.removeFailed'))),
    })
  }

  return (
    <S3BucketForm
      s3={s3}
      title={t('storage.bucket.title')}
      description={t('storage.bucket.description')}
      endpointPlaceholder="https://s3.eu-central-1.amazonaws.com"
      saving={save.isPending}
      removing={remove.isPending}
      disabled={locked}
      onSave={(body) => save.mutate(body, {
        onSuccess: () => toast(i18n.t('admin:storage.bucket.saved')),
        onError: (error) => toast.error(problemMessage(error, i18n.t('admin:storage.bucket.saveFailed'))),
      })}
      onRemove={s3 ? () => void removeBucket() : undefined}
    >
      {locked ? <SetByEnvironment variable="ORBIT_S3_*" className="mt-4" /> : null}
    </S3BucketForm>
  )
}

function UsageCard({ storage, environment }: { storage: StorageView; environment: EnvironmentView }) {
  const { t } = useTranslation('admin')
  const save = useSaveStorageOptions()
  const ready = Boolean(storage.s3)
  // Set when the admin flips "Files in S3" here, so the row says when the move is done, even if it was too quick
  // to show any progress.
  const [watchingMove, setWatchingMove] = useState(false)
  function change(options: Partial<Pick<StorageView, 'attachments_in_s3' | 'backups_in_s3' | 'backup_schedule' | 's3_keep_deleted_days'>>, message: string) {
    save.mutate({
      attachments_in_s3: storage.attachments_in_s3,
      backups_in_s3: storage.backups_in_s3,
      backup_schedule: storage.backup_schedule,
      s3_keep_deleted_days: storage.s3_keep_deleted_days,
      ...options,
    }, {
      onSuccess: () => {
        toast(message)
        if (options.attachments_in_s3 !== undefined) setWatchingMove(true)
      },
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:storage.usage.saveFailed'))),
    })
  }
  const keepOptions = [...new Set([...KEEP_DELETED_DAYS, storage.s3_keep_deleted_days])]
    .sort((left, right) => left - right)
    .map((days) => ({ value: String(days), label: daysLabel(days) }))
  const moving = storage.checking
    ? 'Checking which files to move…'
    : storage.files_to_move > 0
      ? (storage.attachments_in_s3
          ? t('storage.usage.movingToBucket', { count: storage.files_to_move })
          : t('storage.usage.movingToServer', { count: storage.files_to_move }))
      : null
  const moved = watchingMove && !moving && !storage.move_error
    ? (storage.attachments_in_s3 ? 'Done. All files are in the bucket.' : 'Done. All files are on this server.')
    : null
  // `items` lets Select.Value render the option label instead of the raw value.
  const scheduleOptions = SCHEDULES.map((value) => ({ value, label: t(`storage.schedule.${value}`) }))
  return (
    <SettingsCard title={t('storage.usage.title')} description={t('storage.usage.description')} flush>
      <div className="flex flex-col divide-y">
        <SettingsRow className="flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
            {ready ? <span className="inline-flex items-center gap-1.5 font-medium text-foreground">{t('storage.usage.attachments')} <InfoTip text={t('storage.usage.attachmentsHint')} /></span> : <span className="font-medium text-foreground">{t('storage.usage.attachments')}</span>}
            {ready ? null : <span className="text-xs text-muted-foreground">{t('storage.usage.saveBucketFirst')}</span>}
            {moving ? (
              <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {/* The spinner stops when moving failed; Orbit only tries again later. */}
                {storage.move_error ? null : <Spinner role="presentation" aria-hidden aria-label={undefined} className="size-3.5" />}
                {moving}
              </span>
            ) : null}
            {moved ? <span role="status" className="text-xs text-muted-foreground">{moved}</span> : null}
            {storage.move_error ? <span role="alert" className="text-xs text-destructive">{t('storage.usage.moveError', { error: storage.move_error })}</span> : null}
            {environment.attachments_in_s3 ? <SetByEnvironment variable="ORBIT_S3_ATTACHMENTS" /> : null}
          </div>
          <Switch
            aria-label={t('storage.usage.attachments')}
            checked={storage.attachments_in_s3}
            disabled={environment.attachments_in_s3 || (!ready && !storage.attachments_in_s3) || save.isPending}
            onCheckedChange={(checked: boolean) => change({ attachments_in_s3: checked }, checked ? i18n.t('admin:storage.usage.attachmentsOn') : i18n.t('admin:storage.usage.attachmentsOff'))}
          />
        </SettingsRow>
        <SettingsRow className="flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
            {ready ? <span className="inline-flex items-center gap-1.5 font-medium text-foreground">{t('storage.usage.backups')} <InfoTip text={t('storage.usage.backupsHint')} /></span> : <span className="font-medium text-foreground">{t('storage.usage.backups')}</span>}
            {ready ? null : <span className="text-xs text-muted-foreground">{t('storage.usage.saveBucketFirst')}</span>}
            {environment.backups_in_s3 ? <SetByEnvironment variable="ORBIT_S3_BACKUPS" /> : null}
          </div>
          <Switch
            aria-label={t('storage.usage.backups')}
            checked={storage.backups_in_s3}
            disabled={environment.backups_in_s3 || (!ready && !storage.backups_in_s3) || save.isPending}
            onCheckedChange={(checked: boolean) => change({ backups_in_s3: checked }, checked ? i18n.t('admin:storage.usage.backupsOn') : i18n.t('admin:storage.usage.backupsOff'))}
          />
        </SettingsRow>
        <SettingsRow className="flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">{t('storage.usage.automatic')} <InfoTip text={t('storage.usage.automaticHint')} /></span>
            {environment.backup_schedule ? <SetByEnvironment variable="ORBIT_AUTOMATIC_BACKUPS" /> : null}
          </div>
          <Select
            items={scheduleOptions}
            value={storage.backup_schedule}
            disabled={environment.backup_schedule || save.isPending}
            onValueChange={(value) => change({ backup_schedule: value as BackupSchedule }, i18n.t('admin:storage.usage.scheduleSaved'))}
          >
            <SelectTrigger aria-label={t('storage.usage.automatic')} className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {scheduleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        {ready ? (
          <SettingsRow className="flex-nowrap">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">Keep deleted files in S3 <InfoTip text="A deleted or replaced attachment file (for example an image original after Compress images) stays in the bucket this long, then Orbit deletes it. Backups do not contain S3 files: restoring a backup older than this can miss files. The default, 40 days, covers all kept backups." /></span>
              {environment.s3_keep_deleted_days ? <SetByEnvironment variable="ORBIT_S3_KEEP_DELETED_DAYS" /> : null}
            </div>
            <Select
              items={keepOptions}
              value={String(storage.s3_keep_deleted_days)}
              disabled={environment.s3_keep_deleted_days || save.isPending}
              onValueChange={(value) => change({ s3_keep_deleted_days: Number(value) }, 'Deleted files setting saved')}
            >
              <SelectTrigger aria-label="Keep deleted files in S3" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {keepOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SettingsRow>
        ) : null}
      </div>
    </SettingsCard>
  )
}

/** Makes images that were uploaded before the client shrank them smaller, on this server and in S3. */
function ImagesCard({ status }: { status: CompressionStatus }) {
  const { t } = useTranslation('admin')
  const start = useStartImageCompression()
  const done = status.compressed + status.skipped
  const summary = status.compressed > 0
    ? t('storage.images.compressed', { count: status.compressed, before: formatSize(status.bytes_before), after: formatSize(status.bytes_after) })
    : t('storage.images.none')
  return (
    <SettingsCard title={t('storage.images.title')} description={t('storage.images.description')} flush>
      <SettingsRow className="flex-nowrap">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">{t('storage.images.compress')} <InfoTip text={t('storage.images.compressHint')} /></span>
          {status.running ? <LoadingText className="text-xs">{t('storage.images.running', { count: done, summary })}</LoadingText> : null}
          {!status.running && done > 0 ? <span role="status" className="text-xs text-muted-foreground">{t('storage.images.done', { summary })}</span> : null}
          {status.error ? <span role="alert" className="text-xs text-destructive">{t('storage.images.error', { error: status.error })}</span> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={status.running || start.isPending}
          onClick={() => start.mutate(undefined, { onError: (error) => toast.error(problemMessage(error, i18n.t('admin:storage.images.startFailed'))) })}
        >
          {status.running ? t('storage.images.compressing') : t('storage.images.compress')}
        </Button>
      </SettingsRow>
    </SettingsCard>
  )
}
