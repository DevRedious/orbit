import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { BackupSchedule, CompressionStatus, S3View, StorageView } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useInstanceSettings, useRemoveS3, useSaveS3, useSaveStorageOptions, useStartImageCompression } from '@/features/admin/api'
import { S3BucketForm } from '@/features/settings/components/S3BucketForm'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import { formatSize } from '@/lib/attachmentLib'

// Their labels are `admin:storage.schedule.<value>` keys.
const SCHEDULES: BackupSchedule[] = ['off', 'hourly', 'daily']

/** Where attachments and backups are stored: this server's disk or an S3 bucket, and automatic backups. */
export function AdminStoragePage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('storage.title')}><p role="status">{t('loadingSettings')}</p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('storage.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  const storage = settings.data.storage
  return (
    <>
      {/* Remount on save so the form shows what the server stored. */}
      <BucketCard key={JSON.stringify(storage.s3)} s3={storage.s3 ?? null} />
      <UsageCard storage={storage} />
      {storage.image_compression ? <ImagesCard status={storage.image_compression} /> : null}
    </>
  )
}

function BucketCard({ s3 }: { s3: S3View | null }) {
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
      onSave={(body) => save.mutate(body, {
        onSuccess: () => toast(i18n.t('admin:storage.bucket.saved')),
        onError: (error) => toast.error(problemMessage(error, i18n.t('admin:storage.bucket.saveFailed'))),
      })}
      onRemove={s3 ? () => void removeBucket() : undefined}
    />
  )
}

function UsageCard({ storage }: { storage: StorageView }) {
  const { t } = useTranslation('admin')
  const save = useSaveStorageOptions()
  const ready = Boolean(storage.s3)
  function change(options: Partial<Pick<StorageView, 'attachments_in_s3' | 'backups_in_s3' | 'backup_schedule'>>, message: string) {
    save.mutate({
      attachments_in_s3: storage.attachments_in_s3,
      backups_in_s3: storage.backups_in_s3,
      backup_schedule: storage.backup_schedule,
      ...options,
    }, {
      onSuccess: () => toast(message),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:storage.usage.saveFailed'))),
    })
  }
  const moving = storage.files_to_move > 0
    ? (storage.attachments_in_s3
        ? t('storage.usage.movingToBucket', { count: storage.files_to_move })
        : t('storage.usage.movingToServer', { count: storage.files_to_move }))
    : null
  // `items` lets Select.Value render the option label instead of the raw value.
  const scheduleOptions = SCHEDULES.map((value) => ({ value, label: t(`storage.schedule.${value}`) }))
  return (
    <SettingsCard title={t('storage.usage.title')} description={t('storage.usage.description')} flush>
      <div className="flex flex-col divide-y">
        <SettingsRow className="flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
            <span className="font-medium text-foreground">{t('storage.usage.attachments')}</span>
            <span className="text-xs text-muted-foreground">
              {ready
                ? t('storage.usage.attachmentsHint')
                : t('storage.usage.saveBucketFirst')}
            </span>
            {moving ? (
              <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {/* The spinner stops when moving failed; Orbit only tries again later. */}
                {storage.move_error ? null : <Spinner role="presentation" aria-hidden aria-label={undefined} className="size-3.5" />}
                {moving}
              </span>
            ) : null}
            {storage.move_error ? <span role="alert" className="text-xs text-destructive">{t('storage.usage.moveError', { error: storage.move_error })}</span> : null}
          </div>
          <Switch
            aria-label={t('storage.usage.attachments')}
            checked={storage.attachments_in_s3}
            disabled={(!ready && !storage.attachments_in_s3) || save.isPending}
            onCheckedChange={(checked: boolean) => change({ attachments_in_s3: checked }, checked ? i18n.t('admin:storage.usage.attachmentsOn') : i18n.t('admin:storage.usage.attachmentsOff'))}
          />
        </SettingsRow>
        <SettingsRow className="flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
            <span className="font-medium text-foreground">{t('storage.usage.backups')}</span>
            <span className="text-xs text-muted-foreground">
              {ready
                ? t('storage.usage.backupsHint')
                : t('storage.usage.saveBucketFirst')}
            </span>
          </div>
          <Switch
            aria-label={t('storage.usage.backups')}
            checked={storage.backups_in_s3}
            disabled={(!ready && !storage.backups_in_s3) || save.isPending}
            onCheckedChange={(checked: boolean) => change({ backups_in_s3: checked }, checked ? i18n.t('admin:storage.usage.backupsOn') : i18n.t('admin:storage.usage.backupsOff'))}
          />
        </SettingsRow>
        <SettingsRow className="flex-nowrap">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
            <span className="font-medium text-foreground">{t('storage.usage.automatic')}</span>
            <span className="text-xs text-muted-foreground">{t('storage.usage.automaticHint')}</span>
          </div>
          <Select
            items={scheduleOptions}
            value={storage.backup_schedule}
            disabled={save.isPending}
            onValueChange={(value) => change({ backup_schedule: value as BackupSchedule }, i18n.t('admin:storage.usage.scheduleSaved'))}
          >
            <SelectTrigger aria-label={t('storage.usage.automatic')} className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {scheduleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
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
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
          <span className="font-medium text-foreground">{t('storage.images.compress')}</span>
          <span className="text-xs text-muted-foreground">{t('storage.images.compressHint')}</span>
          {status.running ? <span role="status" className="text-xs text-muted-foreground">{t('storage.images.running', { count: done, summary })}</span> : null}
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
