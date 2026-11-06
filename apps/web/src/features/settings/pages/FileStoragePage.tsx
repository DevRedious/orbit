import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from 'cn'
import type { StorageFile, WorkspaceBucketView } from '@orbit/api/generated/types.gen'
import { canDeleteStorageFile, storageFileLabel, storageFilesPage } from '@orbit/api/storage'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { S3BucketForm } from '@/features/settings/components/S3BucketForm'
import { useDeleteStorageFile, useRemoveWorkspaceBucket, useSaveWorkspaceBucket, useWorkspaceBucket, useWorkspaceStorage } from '@/features/workspaces/api'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { formatBytes } from '@/lib/formatBytes'
import { problemMessage } from '@/i18n/problem'

/** The workspace's own S3 bucket, which only admins manage, and its storage use, which every member sees. */
export function FileStoragePage() {
  const { workspace } = useWorkspace()
  const canManage = useCan('storage.manage')
  return (
    <>
      {canManage ? <BucketSettings workspaceId={workspace.id} /> : null}
      <StorageCard workspaceId={workspace.id} />
    </>
  )
}

/** The workspace's own S3 bucket for its files, instead of the installation's storage. */
function BucketSettings({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('settings')
  const bucket = useWorkspaceBucket(workspaceId, true)
  if (bucket.isPending) return <SettingsCard title={t('fileStorage.title')}><p role="status">{t('fileStorage.loading')}</p></SettingsCard>
  if (bucket.isError) return <SettingsCard title={t('fileStorage.title')}><p role="alert">{t('fileStorage.loadFailed')} <Button variant="ghost" onClick={() => void bucket.refetch()}>{t('retry')}</Button></p></SettingsCard>
  // Remount on save so the form shows what the server stored.
  return <BucketForm key={JSON.stringify(bucket.data.s3)} workspaceId={workspaceId} bucket={bucket.data} />
}

function BucketForm({ workspaceId, bucket }: { workspaceId: string; bucket: WorkspaceBucketView }) {
  const { t } = useTranslation('settings')
  const save = useSaveWorkspaceBucket(workspaceId)
  const remove = useRemoveWorkspaceBucket(workspaceId)

  async function removeBucket() {
    const confirmed = await confirmAction({
      title: t('fileStorage.removeTitle'),
      description: t('fileStorage.removeDescription'),
      confirmLabel: t('s3.remove'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(undefined, {
      onSuccess: () => toast(t('fileStorage.removed')),
      onError: (error) => toast.error(problemMessage(error, t('fileStorage.removeFailed'))),
    })
  }

  const count = bucket.files_to_move
  const moving = bucket.checking
    ? t('fileStorage.checking')
    : count > 0
      ? (bucket.removing ? t('fileStorage.leftToMoveBack', { count }) : t('fileStorage.leftToMove', { count }))
      : null
  return (
    <S3BucketForm
      s3={bucket.s3 ?? null}
      title={t('fileStorage.title')}
      description={t('fileStorage.description')}
      endpointPlaceholder="https://s3.eu-central-1.amazonaws.com"
      saving={save.isPending}
      removing={remove.isPending}
      onSave={(body) => save.mutate(body, {
        onSuccess: () => toast(t('fileStorage.saved')),
        onError: (error) => toast.error(problemMessage(error, t('fileStorage.saveFailed'))),
      })}
      onRemove={bucket.s3 && !bucket.removing ? () => void removeBucket() : undefined}
    >
      <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground empty:hidden">
        {bucket.removing ? <span>{t('fileStorage.removing')}</span> : null}
        {moving ? (
          <span role="status" className="flex items-center gap-1.5">
            {/* The spinner stops when moving failed; Orbit only tries again later. */}
            {bucket.move_error ? null : <Spinner role="presentation" aria-hidden aria-label={undefined} className="size-3.5" />}
            {moving}
          </span>
        ) : null}
        {bucket.move_error ? <span role="alert" className="text-destructive">{t('fileStorage.moveError', { error: bucket.move_error })}</span> : null}
      </div>
    </S3BucketForm>
  )
}

/** How much of its storage quota the workspace uses. Every member sees it; admins also see (and can delete) the
    largest files. */
function StorageCard({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('settings')
  const [offset, setOffset] = useState(0)
  const storage = useWorkspaceStorage(workspaceId, offset)
  const files = storage.data?.largest_files ?? []
  const page = storageFilesPage(offset, files.length, storage.data?.file_count ?? 0)
  // a delete emptied the last page: go back one
  if (storage.data && !storage.isPlaceholderData && files.length === 0 && page.previous !== null) setOffset(page.previous)
  const deleteFile = useDeleteStorageFile(workspaceId)
  const used = storage.data?.used_bytes ?? 0
  const quota = storage.data?.quota_bytes ?? null
  const percent = quota ? Math.min(100, (used / quota) * 100) : 0

  async function remove(file: StorageFile) {
    const { name } = storageFileLabel(file)
    if (!await confirmAction({ title: t('fileStorage.deleteTitle', { name }), description: t('fileStorage.deleteDescription'), confirmLabel: t('delete'), danger: true })) return
    deleteFile.mutate(file.id, { onError: () => toast.error(t('fileStorage.deleteFailed')) })
  }

  return (
    <SettingsCard
      title={t('fileStorage.usageTitle')}
      description={t('fileStorage.usageDescription')}
    >
      {storage.isPending ? <p role="status" className="text-[13px] text-muted-foreground">{t('fileStorage.loadingUsage')}</p> : null}
      {storage.isError ? <p role="alert" className="text-[13px] text-destructive">{t('fileStorage.usageFailed')}</p> : null}
      {storage.data ? (
        <Progress
          value={quota ? percent : null}
          className={cn('gap-2', !quota && '[&_[data-slot=progress-track]]:hidden', percent >= 90 && '[&_[data-slot=progress-indicator]]:bg-destructive')}
        >
          <ProgressLabel className="text-[13px] text-foreground">{t('fileStorage.used')}</ProgressLabel>
          <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">
            {quota ? t('fileStorage.usedOf', { used: formatBytes(used), quota: formatBytes(quota) }) : t('fileStorage.usedNoLimit', { used: formatBytes(used) })}
          </span>
        </Progress>
      ) : null}
      {storage.data?.largest_files.length ? (
        <div className="mt-5 flex flex-col gap-2">
          <h3 className="text-[13px] font-medium text-foreground">{t('fileStorage.largest')}</h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {storage.data.largest_files.map((file) => {
              const { name, where } = storageFileLabel(file)
              return (
                <li key={file.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] text-foreground">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{where}</span>
                  </div>
                  <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">{formatBytes(file.byte_size)}</span>
                  {canDeleteStorageFile(file) ? (
                    <Button variant="ghost" size="sm" aria-label={t('fileStorage.deleteAria', { name })} disabled={deleteFile.isPending} onClick={() => void remove(file)}>{t('delete')}</Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {page.previous !== null || page.next !== null ? (
            <div className="flex items-center gap-2">
              <span className="mr-auto text-xs text-muted-foreground tabular-nums">{page.label}</span>
              <Button variant="outline" size="sm" disabled={page.previous === null || storage.isFetching} onClick={() => page.previous !== null && setOffset(page.previous)}>{t('fileStorage.previous')}</Button>
              <Button variant="outline" size="sm" disabled={page.next === null || storage.isFetching} onClick={() => page.next !== null && setOffset(page.next)}>{t('fileStorage.next')}</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </SettingsCard>
  )
}
