import { useRef, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { DocumentUpload, Import, TickCircle, Warning } from 'reicon-react'
import type { ObsidianImport } from '@orbit/api/generated/types.gen'
import { cn } from 'cn'
import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Pane } from '@/components/common/Pane'
import { TitleTip } from '@/components/common/TitleTip'
import { confirmAction } from '@/components/common/confirmAction'
import { isActiveImport, isFinalImport, isImportInProgress } from '@/features/docs/api/notionImports'
import {
  obsidianImportErrorMessage,
  reconcileObsidianImport,
  skippedSummary,
  uploadObsidianArchive,
  useCancelObsidianImport,
  useObsidianImport,
  useObsidianImportTree,
  useObsidianImports,
} from '@/features/docs/api/obsidianImports'
import { isPageNotFound, usePageTree } from '@/features/docs/api/pages'
import { useTeamspaces } from '@/features/docs/api/teamspaces'
import { ImportBody, ImportHeader, ImportedPages, ProgressBar, RecentImports, Stat } from '@/features/docs/components/ImportParts'
import { ObsidianImportChooser } from '@/features/docs/components/ObsidianImportChooser'
import { destinationLabel } from '@/features/docs/import/destination'

/** Catalog key of the pane title. */
const TITLE = 'obsidianImport.title'
const NEW_IMPORT = '/docs/import/obsidian'

type UploadError = { message: string; inProgress: boolean }

/** Step 1: upload the vault as a .zip. Also lists the member's recent imports. */
function UploadStep({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('docs')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const imports = useObsidianImports(workspaceId)
  const input = useRef<HTMLInputElement>(null)
  const [upload, setUpload] = useState<{ name: string; fraction: number; controller: AbortController } | null>(null)
  const [error, setError] = useState<UploadError | null>(null)
  const [dropOver, setDropOver] = useState(false)
  const running = imports.data?.find((item) => isActiveImport(item.status))

  const send = async (file: File | undefined) => {
    if (input.current) input.current.value = ''
    if (!file || upload) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError({ message: t('obsidianImport.errors.archiveInvalid'), inProgress: false })
      return
    }
    const controller = new AbortController()
    setError(null)
    setUpload({ name: file.name, fraction: 0, controller })
    try {
      const created = await uploadObsidianArchive(workspaceId, file, {
        signal: controller.signal,
        onProgress: (fraction) => setUpload((current) => (current ? { ...current, fraction } : current)),
      })
      reconcileObsidianImport(queryClient, workspaceId, created)
      navigate(`${NEW_IMPORT}/${created.id}`)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError({ message: obsidianImportErrorMessage(caught), inProgress: isImportInProgress(caught) })
      if (isImportInProgress(caught)) void imports.refetch()
    } finally {
      setUpload(null)
    }
  }

  return (
    <>
      <ImportHeader title={t(TITLE)} />
      <ImportBody>
        <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <div className="flex flex-col gap-2">
            <TitleTip
              as="h2"
              title={t('obsidianImport.upload')}
              text={t('obsidianImport.uploadHint')}
              className="text-sm font-semibold text-foreground"
            />
            <p className="text-sm text-muted-foreground">
              <Trans t={t} i18nKey="obsidianImport.revealHint" components={{ b: <span className="font-medium text-foreground" /> }} />
            </p>
          </div>
          {upload ? (
            <div className="flex flex-col gap-2" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-sm">
                <Spinner className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-foreground">{t('obsidianImport.uploading', { name: upload.name })}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{Math.round(upload.fraction * 100)}%</span>
              </div>
              <ProgressBar done={Math.round(upload.fraction * 100)} total={100} label={t('obsidianImport.uploadProgress')} />
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => upload.controller.abort()}>
                  {t('obsidianImport.cancelUpload')}
                </Button>
              </div>
            </div>
          ) : (
            <div
              data-slot="drop-zone"
              data-drop-over={dropOver || undefined}
              className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-[background-color,border-color] duration-150 ease-out data-drop-over:border-primary data-drop-over:bg-primary/5"
              onDragOver={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return
                event.preventDefault()
                setDropOver(true)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropOver(false)
              }}
              onDrop={(event) => {
                if (!event.dataTransfer.types.includes('Files')) return
                event.preventDefault()
                setDropOver(false)
                void send(event.dataTransfer.files[0])
              }}
            >
              <DocumentUpload className="size-6 text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">{t('obsidianImport.drop')}</p>
              <input
                ref={input}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                aria-label={t('obsidianImport.fileLabel')}
                onChange={(event) => void send(event.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={() => input.current?.click()}>
                {t('obsidianImport.chooseFile')}
              </Button>
            </div>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}{' '}
              {error.inProgress && running ? (
                <Link className="text-primary underline underline-offset-2" to={`${NEW_IMPORT}/${running.id}`}>
                  {t('notionImport.openRunning')}
                </Link>
              ) : null}
            </p>
          ) : null}
        </section>
        <RecentImports
          imports={imports.data}
          isPending={imports.isPending}
          name={(item) => item.file_name}
          href={(item) => `${NEW_IMPORT}/${item.id}`}
        />
      </ImportBody>
    </>
  )
}

function useCancel(workspaceId: string, item: ObsidianImport) {
  const { t } = useTranslation('docs')
  const cancel = useCancelObsidianImport(workspaceId)
  const request = async (started: boolean) => {
    const confirmed = await confirmAction({
      title: started ? t('notionImport.cancelStartedTitle') : t('notionImport.cancelTitle'),
      description: started ? t('notionImport.cancelStartedDescription') : t('obsidianImport.cancelDescription'),
      confirmLabel: t('notionImport.cancelImport'),
      cancelLabel: t('notionImport.keepGoing'),
      danger: true,
    })
    if (!confirmed) return
    cancel.mutate({ importId: item.id }, { onError: (error) => toast.error(obsidianImportErrorMessage(error)) })
  }
  return { request, pending: cancel.isPending }
}

/** Step 2: the scan job checks the archive and lists its notes. */
function ScanningStep({ workspaceId, item }: { workspaceId: string; item: ObsidianImport }) {
  const { t } = useTranslation('docs')
  const cancel = useCancel(workspaceId, item)
  return (
    <>
      <ImportHeader title={t(TITLE)} detail={item.file_name} />
      <ImportBody>
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
          <Spinner className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t('obsidianImport.reading', { name: item.file_name })}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('obsidianImport.readingHint')}</p>
          <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        </div>
      </ImportBody>
    </>
  )
}

/** Step 3: choose notes and a destination (the scan tree is fetched once). */
function ChooseStep({ workspaceId, item }: { workspaceId: string; item: ObsidianImport }) {
  const { t } = useTranslation('docs')
  const cancel = useCancel(workspaceId, item)
  const scan = useObsidianImportTree(workspaceId, item.id)
  const tree = usePageTree(workspaceId)
  const teamspaces = useTeamspaces(workspaceId)
  return (
    <>
      <ImportHeader
        title={t('obsidianImport.chooseNotes')}
        detail={item.file_name}
        actions={
          <Button type="button" variant="ghost" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        }
      />
      {scan.data ? (
        <ObsidianImportChooser workspaceId={workspaceId} item={item} tree={scan.data} teamspaces={teamspaces.data} pages={tree.data} />
      ) : scan.isError || (scan.isSuccess && !scan.data) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">
            {scan.isError ? obsidianImportErrorMessage(scan.error) : t('obsidianImport.scanUnavailable')}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void scan.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground" />
        </div>
      )}
    </>
  )
}

/** Step 4: the import job runs. */
function ImportingStep({ workspaceId, item }: { workspaceId: string; item: ObsidianImport }) {
  const { t } = useTranslation('docs')
  const cancel = useCancel(workspaceId, item)
  const { done, total, failed } = item.progress
  return (
    <>
      <ImportHeader title={t(TITLE)} detail={item.file_name} />
      <ImportBody>
        <section className="flex flex-col gap-4 py-10" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Spinner className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {item.status === 'queued' ? t('notionImport.waiting') : t('obsidianImport.importing')}
            </p>
          </div>
          <ProgressBar done={done + failed} total={total} label={t('notionImport.progress')} />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{t('notionImport.progressImported', { done, total })}</span>
            {failed > 0 ? <span className="text-destructive">{t('notionImport.failedCount', { count: failed })}</span> : null}
            <span className="flex-1" />
            <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(true)}>
              {t('notionImport.cancelImport')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('notionImport.leaveHint')}
          </p>
        </section>
      </ImportBody>
    </>
  )
}

/** Step 5: completed, failed, cancelled or expired. A refused archive ends here as `failed` with its reason. */
function ResultStep({ workspaceId, item }: { workspaceId: string; item: ObsidianImport }) {
  const { t } = useTranslation('docs')
  const tree = usePageTree(workspaceId)
  const teamspaces = useTeamspaces(workspaceId)
  const report = item.report
  const failed = item.status === 'failed'
  const destination = destinationLabel(item.destination, teamspaces.data, tree.data)
  const headline =
    item.status === 'completed'
      ? t('notionImport.resultCompleted')
      : failed
        ? t('notionImport.resultFailed')
        : item.status === 'cancelled'
          ? t('notionImport.resultCancelled')
          : t('notionImport.resultExpired')
  const skipped = report ? skippedSummary(report.skipped_files) : null
  const notes: string[] = []
  if (report) {
    const { missing_files: missing, unresolved_links: unresolved, truncated_blocks: truncated, unfilled_pages_trashed: trashed } = report
    if (missing > 0) notes.push(t('obsidianImport.noteMissingFiles', { count: missing }))
    if (unresolved > 0) notes.push(t('obsidianImport.noteUnresolvedLinks', { count: unresolved }))
    if (truncated > 0) notes.push(t('obsidianImport.noteTruncatedBlocks', { count: truncated }))
    if (trashed > 0) notes.push(t('obsidianImport.noteUnfilledTrashed', { count: trashed }))
  }

  return (
    <>
      <ImportHeader title={t(TITLE)} detail={item.file_name} />
      <ImportBody>
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {item.status === 'completed' ? (
              <TickCircle className="size-5 text-primary" />
            ) : (
              <Warning className={cn('size-5', failed ? 'text-destructive' : 'text-muted-foreground')} />
            )}
            <h2 className="text-base font-semibold text-foreground">{headline}</h2>
          </div>
          {item.error ? (
            failed ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground">
                {item.error}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{item.error}</p>
            )
          ) : null}
          {destination && item.progress.total > 0 ? <p className="text-sm text-muted-foreground">{t('notionImport.destination', { destination })}</p> : null}
        </section>
        {item.progress.total > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-[599px]:grid-cols-1">
            <Stat label={t('notionImport.statPagesImported')} value={item.progress.done} />
            <Stat label={t('notionImport.statFilesImported')} value={report?.files_imported ?? 0} />
            <Stat label={t('notionImport.statPagesFailed')} value={item.progress.failed} />
          </div>
        ) : null}
        <ImportedPages rootIds={item.root_page_ids} pages={tree.data} />
        {notes.length > 0 || (skipped && skipped.total > 0) ? (
          <section className="flex flex-col gap-2" aria-label={t('notionImport.notes')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('notionImport.notes')}</h3>
            {notes.map((note) => (
              <p key={note} className="text-sm text-foreground">
                {note}
              </p>
            ))}
            {skipped && skipped.total > 0 ? (
              <p className="text-sm text-foreground">
                {t('obsidianImport.skippedFilesLabel')} <span className="text-muted-foreground">{skipped.parts.join(', ')}</span>
              </p>
            ) : null}
          </section>
        ) : null}
        {report && report.failures.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('notionImport.failedPages')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('notionImport.failedPages')}</h3>
            <ul className="flex flex-col border-t border-border">
              {report.failures.map((failure) => (
                <li key={failure.path} className="flex flex-col gap-0.5 border-b border-border px-1 py-2">
                  <span className="text-[0.8125rem] text-foreground">{failure.title.trim() ? failure.title : failure.path}</span>
                  <span className="text-xs text-muted-foreground">{failure.error}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div>
          <Link className={buttonVariants({ variant: failed ? 'default' : 'outline' })} to={NEW_IMPORT}>
            <Import className="size-4" />
            {failed ? t('obsidianImport.uploadAnother') : t('notionImport.importMore')}
          </Link>
        </div>
      </ImportBody>
    </>
  )
}

/**
 * `/docs/import/obsidian` (upload + recent imports) and `/docs/import/obsidian/:importId` (one import through its
 * states), a pane next to the page tree like the Notion import.
 */
export function ObsidianImportPane({ workspaceId, importId }: { workspaceId: string; importId?: string }) {
  const { t } = useTranslation('docs')
  const query = useObsidianImport(workspaceId, importId)
  let content: ReactNode
  if (!importId) {
    content = <UploadStep workspaceId={workspaceId} />
  } else if (query.data) {
    const item = query.data
    if (item.status === 'scanning') content = <ScanningStep workspaceId={workspaceId} item={item} />
    else if (item.status === 'ready') content = <ChooseStep key={item.id} workspaceId={workspaceId} item={item} />
    else if (item.status === 'queued' || item.status === 'importing') content = <ImportingStep workspaceId={workspaceId} item={item} />
    else if (isFinalImport(item.status)) content = <ResultStep workspaceId={workspaceId} item={item} />
  } else if (query.isError) {
    const missing = isPageNotFound(query.error)
    content = (
      <>
        <ImportHeader title={t(TITLE)} />
        <div className="flex flex-1 flex-col p-6">
          <EmptyState
            icon={Import}
            title={missing ? t('notionImport.notFound') : t('notionImport.unavailable')}
            description={missing ? t('notionImport.notFoundHint') : t('notionImport.unavailableHint')}
            action={
              <div className="flex gap-2">
                {missing ? null : (
                  <Button type="button" variant="outline" onClick={() => void query.refetch()}>
                    {t('retry')}
                  </Button>
                )}
                <Link className={buttonVariants({ variant: 'outline' })} to={NEW_IMPORT}>
                  {t('notionImport.newImport')}
                </Link>
              </div>
            }
          />
        </div>
      </>
    )
  } else {
    content = (
      <>
        <ImportHeader title={t(TITLE)} />
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground" />
        </div>
      </>
    )
  }
  return <Pane>{content}</Pane>
}
