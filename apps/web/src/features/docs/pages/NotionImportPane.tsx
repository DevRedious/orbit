import { useState, type FormEvent, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, DocumentText as FileText, Import, TickCircle, Warning } from 'reicon-react'
import type { NotionImport } from '@orbit/api/generated/types.gen'
import { apiClient } from '@/api/client'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Pane, PaneTitle } from '@/components/common/Pane'
import { confirmAction } from '@/components/common/confirmAction'
import { i18n } from '@/i18n'
import { relativeTime } from '@/lib/format'
import {
  createNotionImportRequest,
  isActiveImport,
  isFinalImport,
  isImportInProgress,
  notionImportErrorMessage,
  notionImportStatusLabel,
  reconcileNotionImport,
  useCancelNotionImport,
  useNotionImport,
  useNotionImportTree,
  useNotionImports,
} from '@/features/docs/api/notionImports'
import { isPageNotFound, usePageTree } from '@/features/docs/api/pages'
import { useTeamspaces } from '@/features/docs/api/teamspaces'
import { pageTitle } from '@/features/docs/pageTree'
import { NotionImportChooser } from '@/features/docs/components/NotionImportChooser'
import { destinationLabel } from '@/features/docs/notionImport/destination'
import { useQueryClient } from '@tanstack/react-query'

const TOKEN_URL = 'https://www.notion.so/developers/tokens'

const RESULT_HEADLINES = {
  completed: 'notionImport.resultCompleted',
  failed: 'notionImport.resultFailed',
  cancelled: 'notionImport.resultCancelled',
  expired: 'notionImport.resultExpired',
} as const

function ImportHeader({ title, detail, actions }: { title: string; detail?: string | null; actions?: ReactNode }) {
  const { t } = useTranslation('docs')
  const navigate = useNavigate()
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="hidden text-muted-foreground/70 max-[899px]:inline-flex"
        aria-label={t('backToDocs')}
        onClick={() => navigate('/docs')}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <PaneTitle render={<h1 />}>{title}</PaneTitle>
      {detail ? <span className="truncate text-[13px] text-muted-foreground">{detail}</span> : null}
      <span className="flex-1" />
      {actions}
    </div>
  )
}

function Body({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 max-[899px]:p-4">{children}</div>
    </div>
  )
}

function statusVariant(status: NotionImport['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') return 'destructive'
  if (status === 'completed') return 'secondary'
  if (isActiveImport(status) || status === 'ready') return 'default'
  return 'outline'
}

/** Step 1: paste a token. Also lists the member's recent imports. */
function ConnectStep({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('docs')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const imports = useNotionImports(workspaceId)
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const running = imports.data?.find((item) => isActiveImport(item.status))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = token.trim()
    if (!value || pending) return
    setPending(true)
    setError(null)
    try {
      const created = await createNotionImportRequest(apiClient, workspaceId, value)
      setToken('')
      reconcileNotionImport(queryClient, workspaceId, created)
      navigate(`/docs/import/${created.id}`)
    } catch (caught) {
      setError(caught)
      if (isImportInProgress(caught)) void imports.refetch()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <ImportHeader title={t('notionImport.title')} />
      <Body>
        <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">{t('notionImport.connect')}</h2>
            <p className="text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="notionImport.connectHint"
                components={{
                  link: (
                    <a className="text-primary underline underline-offset-2" href={TOKEN_URL} target="_blank" rel="noreferrer noopener">
                      {TOKEN_URL}
                    </a>
                  ),
                }}
              />
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)} autoComplete="off">
            <div className="grid gap-1.5">
              <Label htmlFor="notion-token">{t('notionImport.token')}</Label>
              <PasswordInput
                id="notion-token"
                name="notion-token"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                placeholder="ntn_…"
                value={token}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {notionImportErrorMessage(error)}{' '}
                {isImportInProgress(error) && running ? (
                  <Link className="text-primary underline underline-offset-2" to={`/docs/import/${running.id}`}>
                    {t('notionImport.openRunning')}
                  </Link>
                ) : null}
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={!token.trim() || pending}>
                {pending ? <Spinner className="size-4" /> : null}
                {t('notionImport.scan')}
              </Button>
            </div>
          </form>
        </section>
        <RecentImports imports={imports.data} isPending={imports.isPending} />
      </Body>
    </>
  )
}

function RecentImports({ imports, isPending }: { imports: NotionImport[] | undefined; isPending: boolean }) {
  const { t } = useTranslation('docs')
  if (isPending) return null
  if (!imports?.length) return null
  return (
    <section className="flex flex-col gap-2" aria-label={t('notionImport.recent')}>
      <h2 className="text-xs font-medium text-muted-foreground">{t('notionImport.recent')}</h2>
      <div className="flex flex-col border-t border-border">
        {imports.map((item) => (
          <Link
            key={item.id}
            to={`/docs/import/${item.id}`}
            className="flex min-h-10 min-w-0 items-center gap-3 border-b border-border px-1 py-1.5 text-[13px] transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
          >
            <span className="min-w-0 flex-1 truncate text-foreground">{item.notion_workspace_name || 'Notion'}</span>
            {item.progress.total > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('notionImport.progressShort', { done: item.progress.done, total: item.progress.total })}
              </span>
            ) : null}
            <Badge variant={statusVariant(item.status)}>{notionImportStatusLabel(item.status)}</Badge>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground" title={new Date(item.created_at).toLocaleString(i18n.language)}>
              {relativeTime(item.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  )
}

function useCancel(workspaceId: string, item: NotionImport) {
  const { t } = useTranslation('docs')
  const cancel = useCancelNotionImport(workspaceId)
  const request = async (started: boolean) => {
    const confirmed = await confirmAction({
      title: started ? t('notionImport.cancelStartedTitle') : t('notionImport.cancelTitle'),
      description: started ? t('notionImport.cancelStartedDescription') : t('notionImport.cancelDescription'),
      confirmLabel: t('notionImport.cancelImport'),
      cancelLabel: t('notionImport.keepGoing'),
      danger: true,
    })
    if (!confirmed) return
    cancel.mutate(
      { importId: item.id },
      { onError: (error) => toast.error(notionImportErrorMessage(error)) },
    )
  }
  return { request, pending: cancel.isPending }
}

/** Step 2: the scan job lists what the token can see. */
function ScanningStep({ workspaceId, item }: { workspaceId: string; item: NotionImport }) {
  const { t } = useTranslation('docs')
  const cancel = useCancel(workspaceId, item)
  return (
    <>
      <ImportHeader title={t('notionImport.title')} detail={item.notion_workspace_name} />
      <Body>
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
          <Spinner className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {item.notion_workspace_name ? t('notionImport.scanningNamed', { name: item.notion_workspace_name }) : t('notionImport.scanning')}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('notionImport.scanningHint')}</p>
          <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        </div>
      </Body>
    </>
  )
}

/** Step 4: the import job runs. */
function ImportingStep({ workspaceId, item }: { workspaceId: string; item: NotionImport }) {
  const { t } = useTranslation('docs')
  const cancel = useCancel(workspaceId, item)
  const { done, total, failed } = item.progress
  return (
    <>
      <ImportHeader title={t('notionImport.title')} detail={item.notion_workspace_name} />
      <Body>
        <section className="flex flex-col gap-4 py-10" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Spinner className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {item.status === 'queued' ? t('notionImport.waiting') : t('notionImport.importing')}
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
      </Body>
    </>
  )
}

function countEntries(map: Record<string, number>): [string, number][] {
  return Object.entries(map)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2">
      <span className="text-lg font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

/** Step 5: completed, failed, cancelled or expired. */
function ResultStep({ workspaceId, item }: { workspaceId: string; item: NotionImport }) {
  const { t } = useTranslation('docs')
  const navigate = useNavigate()
  const tree = usePageTree(workspaceId)
  const teamspaces = useTeamspaces(workspaceId)
  const report = item.report
  const roots = item.root_page_ids
  const titles = new Map((tree.data ?? []).map((page) => [page.id, page]))
  const destination = destinationLabel(item.destination, teamspaces.data, tree.data)
  const headline = t(item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled' ? RESULT_HEADLINES[item.status] : RESULT_HEADLINES.expired)
  const skipped = countEntries(report?.skipped ?? {})
  const lossy = countEntries(report?.lossy ?? {})
  const notes: string[] = []
  if (report) {
    if (report.missing_files > 0) notes.push(t('notionImport.noteMissingFiles', { count: report.missing_files }))
    if (report.unresolved_page_links > 0) notes.push(t('notionImport.noteUnresolvedLinks', { count: report.unresolved_page_links }))
    if (report.truncated_blocks > 0) notes.push(t('notionImport.noteTruncatedBlocks', { count: report.truncated_blocks }))
    if (report.previously_imported > 0) notes.push(t('notionImport.notePreviouslyImported', { count: report.previously_imported }))
    if (report.unfilled_pages_trashed > 0) notes.push(t('notionImport.noteUnfilledTrashed', { count: report.unfilled_pages_trashed }))
  }

  return (
    <>
      <ImportHeader title={t('notionImport.title')} detail={item.notion_workspace_name} />
      <Body>
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {item.status === 'completed' ? (
              <TickCircle className="size-5 text-primary" />
            ) : (
              <Warning className={cn('size-5', item.status === 'failed' ? 'text-destructive' : 'text-muted-foreground')} />
            )}
            <h2 className="text-base font-semibold text-foreground">{headline}</h2>
          </div>
          {item.error ? <p className="text-sm text-muted-foreground">{item.error}</p> : null}
          {destination && item.progress.total > 0 ? <p className="text-sm text-muted-foreground">{t('notionImport.destination', { destination })}</p> : null}
        </section>
        {item.progress.total > 0 ? (
          <div className="grid grid-cols-3 gap-2 max-[599px]:grid-cols-1">
            <Stat label={t('notionImport.statPagesImported')} value={item.progress.done} />
            <Stat label={t('notionImport.statFilesImported')} value={report?.files_imported ?? 0} />
            <Stat label={t('notionImport.statPagesFailed')} value={item.progress.failed} />
          </div>
        ) : null}
        {roots.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('notionImport.importedPages')}>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">{t('notionImport.importedPages')}</h3>
              <span className="flex-1" />
              <Button type="button" size="sm" onClick={() => navigate(`/docs/${roots[0]}`)}>
                {t('notionImport.openImported')}
              </Button>
            </div>
            <ul className="flex flex-col border-t border-border">
              {roots.slice(0, 50).map((id) => (
                <li key={id} className="border-b border-border">
                  <Link to={`/docs/${id}`} className="flex h-9 items-center gap-2 px-1 text-[13px] text-foreground transition-colors duration-150 ease-out hover:bg-sidebar-accent/50">
                    <FileText className="size-[15px] shrink-0 text-muted-foreground/70" />
                    <span className="truncate">{titles.has(id) ? pageTitle(titles.get(id)) : t('notionImport.importedPage')}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {roots.length > 50 ? <p className="text-xs text-muted-foreground">{t('notionImport.andMore', { count: roots.length - 50 })}</p> : null}
          </section>
        ) : null}
        {notes.length > 0 || skipped.length > 0 || lossy.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('notionImport.notes')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('notionImport.notes')}</h3>
            {notes.map((note) => (
              <p key={note} className="text-sm text-foreground">
                {note}
              </p>
            ))}
            {skipped.length > 0 ? (
              <p className="text-sm text-foreground">
                {t('notionImport.skippedBlocks')}{' '}
                <span className="text-muted-foreground">{skipped.map(([kind, count]) => `${kind.replaceAll('_', ' ')} (${count})`).join(', ')}</span>
              </p>
            ) : null}
            {lossy.length > 0 ? (
              <p className="text-sm text-foreground">
                {t('notionImport.simplifiedBlocks')}{' '}
                <span className="text-muted-foreground">{lossy.map(([kind, count]) => `${kind.replaceAll('_', ' ')} (${count})`).join(', ')}</span>
              </p>
            ) : null}
          </section>
        ) : null}
        {report && report.failures.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('notionImport.failedPages')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('notionImport.failedPages')}</h3>
            <ul className="flex flex-col border-t border-border">
              {report.failures.map((failure) => (
                <li key={failure.notion_id} className="flex flex-col gap-0.5 border-b border-border px-1 py-2">
                  <span className="text-[13px] text-foreground">{failure.title.trim() ? failure.title : t('untitled')}</span>
                  <span className="text-xs text-muted-foreground">{failure.error}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div>
          <Link className={buttonVariants({ variant: 'outline' })} to="/docs/import">
            <Import className="size-4" />
            {t('notionImport.importMore')}
          </Link>
        </div>
      </Body>
    </>
  )
}

/** Step 3 wrapper: header with the workspace name and a cancel action, then the chooser (scan tree fetched once). */
function ChooseStep({ workspaceId, item }: { workspaceId: string; item: NotionImport }) {
  const { t } = useTranslation('docs')
  const cancel = useCancel(workspaceId, item)
  const scan = useNotionImportTree(workspaceId, item.id)
  const tree = usePageTree(workspaceId)
  const teamspaces = useTeamspaces(workspaceId)
  return (
    <>
      <ImportHeader
        title={t('notionImport.choosePages')}
        detail={item.notion_workspace_name}
        actions={
          <Button type="button" variant="ghost" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        }
      />
      {scan.data ? (
        <NotionImportChooser workspaceId={workspaceId} item={item} tree={scan.data} teamspaces={teamspaces.data} pages={tree.data} />
      ) : scan.isError || (scan.isSuccess && !scan.data) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">
            {scan.isError ? notionImportErrorMessage(scan.error) : t('notionImport.scanUnavailable')}
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

/**
 * `/docs/import` (connect + recent imports) and `/docs/import/:importId` (one import through its states). A pane
 * next to the page tree, like Trash: imported pages appear in the tree while the import runs, and the URL survives
 * reloads during a long import.
 */
export function NotionImportPane({ workspaceId, importId }: { workspaceId: string; importId?: string }) {
  const { t } = useTranslation('docs')
  const query = useNotionImport(workspaceId, importId)
  let content: ReactNode
  if (!importId) {
    content = <ConnectStep workspaceId={workspaceId} />
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
        <ImportHeader title={t('notionImport.title')} />
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
                <Link className={buttonVariants({ variant: 'outline' })} to="/docs/import">
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
        <ImportHeader title={t('notionImport.title')} />
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground" />
        </div>
      </>
    )
  }
  return <Pane>{content}</Pane>
}
