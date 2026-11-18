import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Clock, Import, Search4 as Search, TickCircle, Warning } from 'reicon-react'
import type { LinearImport, LinearImportTree } from '@orbit/api/generated/types.gen'
import { apiClient } from '@/api/client'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Pane } from '@/components/common/Pane'
import { confirmAction } from '@/components/common/confirmAction'
import { relativeTime } from '@/lib/format'
import { ApiProblem } from '@orbit/api/problem'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { useProjects } from '@/features/tasks/api/projects'
import { IMPORT_STATUS_LABELS, importStatusVariant, isActiveImport, isFinalImport } from '@/features/tasks/api/importStatus'
import { ImportBody, ImportHeader, ImportProgressBar, ImportStat } from '@/features/tasks/components/ImportLayout'
import {
  createLinearImportRequest,
  isLinearImportInProgress,
  linearImportErrorMessage,
  linearImportProgress,
  linearRateLimitNotice,
  reconcileLinearImport,
  useCancelLinearImport,
  useLinearImport,
  useLinearImportTree,
  useLinearImports,
  useStartLinearImport,
} from '@/features/tasks/api/linearImports'

const KEY_URL = 'https://linear.app/settings/account/security'
const ROOT = '/tasks-import/linear'

/** Step 1: paste a personal API key. Also lists the member's recent imports. */
function ConnectStep({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const imports = useLinearImports(workspaceId)
  const [key, setKey] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const running = imports.data?.find((item) => isActiveImport(item.status))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = key.trim()
    if (!value || pending) return
    setPending(true)
    setError(null)
    try {
      const created = await createLinearImportRequest(apiClient, workspaceId, value)
      setKey('')
      reconcileLinearImport(queryClient, workspaceId, created)
      navigate(`${ROOT}/${created.id}`)
    } catch (caught) {
      setError(caught)
      if (isLinearImportInProgress(caught)) void imports.refetch()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <ImportHeader title={t('import.linear.title')} />
      <ImportBody>
        <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">{t('import.linear.connect')}</h2>
            <p className="text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="import.linear.connectHelp"
                values={{ url: KEY_URL }}
                components={{ docLink: <a className="text-primary underline underline-offset-2" href={KEY_URL} target="_blank" rel="noreferrer noopener" /> }}
              />
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)} autoComplete="off">
            <div className="grid gap-1.5">
              <Label htmlFor="linear-key">{t('import.linear.keyLabel')}</Label>
              <PasswordInput
                id="linear-key"
                name="linear-key"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                placeholder="lin_api_…"
                value={key}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setKey(event.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {linearImportErrorMessage(error)}{' '}
                {isLinearImportInProgress(error) && running ? (
                  <Link className="text-primary underline underline-offset-2" to={`${ROOT}/${running.id}`}>
                    {t('import.common.openRunning')}
                  </Link>
                ) : null}
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={!key.trim() || pending}>
                {pending ? <Spinner className="size-4" /> : null}
                {t('import.linear.findTeams')}
              </Button>
            </div>
          </form>
        </section>
        <RecentImports imports={imports.data} />
      </ImportBody>
    </>
  )
}

function RecentImports({ imports }: { imports: LinearImport[] | undefined }) {
  const { t } = useTranslation('tasks')
  if (!imports?.length) return null
  return (
    <section className="flex flex-col gap-2" aria-label={t('import.common.recent')}>
      <h2 className="text-xs font-medium text-muted-foreground">{t('import.common.recent')}</h2>
      <div className="flex flex-col border-t border-border">
        {imports.map((item) => (
          <Link
            key={item.id}
            to={`${ROOT}/${item.id}`}
            className="flex min-h-10 min-w-0 items-center gap-3 border-b border-border px-1 py-1.5 text-[0.8125rem] transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
          >
            <span className="min-w-0 flex-1 truncate text-foreground">{item.linear_user_name || 'Linear'}</span>
            {item.progress.total > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('import.linear.recentProgress', { done: item.progress.done, total: item.progress.total })}
              </span>
            ) : null}
            <Badge variant={importStatusVariant(item.status)}>{IMPORT_STATUS_LABELS[item.status]}</Badge>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground" title={new Date(item.created_at).toLocaleString()}>
              {relativeTime(item.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function useCancel(workspaceId: string, item: LinearImport) {
  const { t } = useTranslation('tasks')
  const cancel = useCancelLinearImport(workspaceId)
  const request = async (started: boolean) => {
    const confirmed = await confirmAction({
      title: started ? t('import.common.cancelStartedTitle') : t('import.common.cancelTitle'),
      description: started
        ? t('import.linear.cancelStartedDescription')
        : t('import.linear.cancelDescription'),
      confirmLabel: t('import.common.cancelImport'),
      cancelLabel: t('import.common.keepGoing'),
      danger: true,
    })
    if (!confirmed) return
    cancel.mutate({ importId: item.id }, { onError: (error) => toast.error(linearImportErrorMessage(error)) })
  }
  return { request, pending: cancel.isPending }
}

/** Step 2: the scan job lists the teams the key can see. */
function ScanningStep({ workspaceId, item }: { workspaceId: string; item: LinearImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  return (
    <>
      <ImportHeader title={t('import.linear.title')} detail={item.linear_user_name} />
      <ImportBody>
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
          <Spinner className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t('import.linear.scanning')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('import.linear.scanningDescription')}</p>
          <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        </div>
      </ImportBody>
    </>
  )
}

/** Step 3: pick teams. Active teams start selected, archived ones do not. */
function TeamChooser({ workspaceId, item, tree }: { workspaceId: string; item: LinearImport; tree: LinearImportTree }) {
  const { t } = useTranslation('tasks')
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(tree.teams.filter((team) => !team.archived).map((team) => team.id)))
  const [query, setQuery] = useState('')
  const start = useStartLinearImport(workspaceId)
  const needle = query.trim().toLowerCase()
  const teams = useMemo(
    () => (needle ? tree.teams.filter((team) => `${team.name} ${team.key}`.toLowerCase().includes(needle)) : tree.teams),
    [tree.teams, needle],
  )
  const visible = teams.map((team) => team.id)
  const count = selected.size
  const issues = tree.teams.filter((team) => selected.has(team.id)).reduce((sum, team) => sum + team.issue_count, 0)
  const toggle = (ids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  const chosen = visible.filter((id) => selected.has(id)).length
  const allChecked = chosen > 0 && chosen === visible.length
  const someChecked = chosen > 0 && chosen < visible.length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tree.truncated ? (
        <p role="status" className="flex items-start gap-2 border-b border-border bg-amber-500/5 px-4 py-2 text-xs text-foreground">
          <Warning className="mt-px size-3.5 shrink-0 text-amber-600" />
          {t('import.linear.truncated')}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2">
        <InputGroup className="w-64 rounded-lg border-border bg-foreground/[0.02] max-[899px]:w-full">
          <InputGroupAddon align="inline-start">
            <Search className="size-3.5 text-muted-foreground/70" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            className="text-xs"
            placeholder={t('import.linear.filter')}
            aria-label={t('import.linear.filter')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        <div className="flex items-center gap-2 text-[0.8125rem] text-foreground">
          <Checkbox
            aria-label={t('import.linear.selectAll')}
            checked={allChecked}
            indeterminate={someChecked}
            disabled={visible.length === 0}
            onCheckedChange={() => toggle(visible, !allChecked)}
          />
          <button type="button" tabIndex={-1} disabled={visible.length === 0} onClick={() => toggle(visible, !allChecked)}>
            {t('import.common.selectAll')}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {teams.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{needle ? t('import.linear.noMatch') : t('import.linear.empty')}</p>
        ) : (
          <section className="flex flex-col gap-1" aria-label={tree.organization}>
            <h2 className="px-2 pt-2 pb-1 text-xs font-semibold text-foreground">{tree.organization}</h2>
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[0.8125rem] text-foreground transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
              >
                <Checkbox aria-label={t('import.common.select', { name: team.name })} checked={selected.has(team.id)} onCheckedChange={(checked) => toggle([team.id], checked)} />
                {/* Clicking the name toggles the row, like the checkbox (the checkbox is the keyboard control). */}
                <button type="button" tabIndex={-1} className="min-w-0 flex-1 truncate text-left" onClick={() => toggle([team.id], !selected.has(team.id))}>
                  {team.name}
                  {team.key ? <span className="text-muted-foreground"> · {team.key}</span> : null}
                </button>
                {team.archived ? <Badge variant="outline">{t('import.common.archived')}</Badge> : null}
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t('import.linear.issueCount', { count: team.issue_count })}
                </span>
              </div>
            ))}
          </section>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t('import.linear.summary')}
        </p>
        <div className="flex flex-col items-end gap-1.5">
          {start.isError ? (
            <p role="alert" className="max-w-96 text-right text-xs text-destructive">
              {linearImportErrorMessage(start.error)}
            </p>
          ) : null}
          <Button
            type="button"
            className="tabular-nums"
            disabled={count === 0 || start.isPending}
            title={count > 0 ? t('import.linear.about', { count: issues }) : undefined}
            onClick={() => start.mutate({ importId: item.id, teamIds: [...selected] })}
          >
            {t('import.linear.start', { count })}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChooseStep({ workspaceId, item }: { workspaceId: string; item: LinearImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  const scan = useLinearImportTree(workspaceId, item.id)
  return (
    <>
      <ImportHeader
        title={t('import.linear.chooseTitle')}
        detail={item.linear_user_name}
        actions={
          <Button type="button" variant="ghost" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        }
      />
      {scan.data ? (
        <TeamChooser workspaceId={workspaceId} item={item} tree={scan.data} />
      ) : scan.isError || (scan.isSuccess && !scan.data) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{scan.isError ? linearImportErrorMessage(scan.error) : t('import.linear.listUnavailable')}</p>
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

/** Step 4: the import job runs: it reads the issues, creates the tasks, adds files and comments, then links. */
function ImportingStep({ workspaceId, item }: { workspaceId: string; item: LinearImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  const progress = linearImportProgress(item)
  const { failed } = item.progress
  // the poll keeps the same data while the import waits, so the minutes left need their own clock
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!item.waiting_until) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [item.waiting_until])
  const notice = linearRateLimitNotice(item.waiting_until, now)
  return (
    <>
      <ImportHeader title={t('import.linear.title')} detail={item.linear_user_name} />
      <ImportBody>
        <section className="flex flex-col gap-4 py-10" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Spinner className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{progress.label}</p>
            {progress.step ? <span className="ml-auto text-xs text-muted-foreground tabular-nums">{t('import.linear.step', { step: progress.step })}</span> : null}
          </div>
          <ImportProgressBar done={progress.done} total={progress.total} />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="tabular-nums">{progress.detail}</span>
            {failed > 0 ? <span className="text-destructive">{t('import.common.failedCount', { count: failed })}</span> : null}
            <span className="flex-1" />
            <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(true)}>
              {t('import.common.cancelImport')}
            </Button>
          </div>
          {notice ? (
            <p className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {notice}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t('import.linear.leave')}
          </p>
        </section>
      </ImportBody>
    </>
  )
}

/** Step 5: completed, failed, cancelled or expired. */
function ResultStep({ workspaceId, item }: { workspaceId: string; item: LinearImport }) {
  const { t } = useTranslation('tasks')
  const projects = useProjects(workspaceId)
  const names = new Map((projects.data ?? []).map((project) => [project.id, project]))
  const report = item.report
  const headline =
    item.status === 'completed'
      ? t('import.common.headline.completed')
      : item.status === 'failed'
        ? t('import.common.headline.failed')
        : item.status === 'cancelled'
          ? t('import.common.headline.cancelled')
          : t('import.common.headline.expired')
  const notes: string[] = []
  if (report) {
    if (report.relations_linked > 0) notes.push(t('import.linear.notes.relationsLinked', { count: report.relations_linked }))
    if (report.relations_skipped > 0)
      notes.push(t('import.linear.notes.relationsSkipped', { count: report.relations_skipped }))
    if (report.links_added > 0) notes.push(t('import.linear.notes.links', { count: report.links_added }))
    if (report.unmatched_assignees > 0)
      notes.push(t('import.linear.notes.unmatchedAssignees', { count: report.unmatched_assignees }))
    if (report.missing_files > 0) notes.push(t('import.linear.notes.missingFiles', { count: report.missing_files }))
    if (report.detached_sub_issues > 0)
      notes.push(t('import.linear.notes.detachedSubIssues', { count: report.detached_sub_issues }))
  }
  return (
    <>
      <ImportHeader title={t('import.linear.title')} detail={item.linear_user_name} />
      <ImportBody>
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
        </section>
        {report ? (
          <div className="grid grid-cols-4 gap-2 max-[599px]:grid-cols-2">
            <ImportStat label={t('import.linear.issuesImported')} value={item.progress.done} />
            <ImportStat label={t('import.common.comments')} value={report.comments_imported} />
            <ImportStat label={t('import.common.files')} value={report.files_imported} />
            <ImportStat label={t('import.common.failed')} value={item.progress.failed} />
          </div>
        ) : null}
        {item.project_ids.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('import.common.importedProjects')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('import.common.importedProjects')}</h3>
            <ul className="flex flex-col border-t border-border">
              {item.project_ids.map((id) => {
                const project = names.get(id)
                return (
                  <li key={id} className="border-b border-border">
                    <Link
                      to={`/tasks?project=${id}`}
                      className="flex h-9 items-center gap-2 px-1 text-[0.8125rem] text-foreground transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
                    >
                      <span className="mx-[3px] size-2 shrink-0 rounded-[2px]" style={{ background: project?.color }} />
                      <span className="truncate">{project?.name ?? t('import.common.importedProject')}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
        {notes.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('import.common.notesLabel')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('import.common.notes')}</h3>
            {notes.map((note) => (
              <p key={note} className="text-sm text-foreground">
                {note}
              </p>
            ))}
          </section>
        ) : null}
        {report && report.failures.length > 0 ? (
          <section className="flex flex-col gap-2" aria-label={t('import.common.failedItems')}>
            <h3 className="text-xs font-medium text-muted-foreground">{t('import.common.notImported')}</h3>
            <ul className="flex flex-col border-t border-border">
              {report.failures.map((failure) => (
                <li key={`${failure.kind}-${failure.linear_id}`} className="flex flex-col gap-0.5 border-b border-border px-1 py-2">
                  <span className="text-[0.8125rem] text-foreground">
                    {failure.title.trim() ? failure.title : t('untitled')}
                    {failure.kind === 'issue' ? null : <span className="text-muted-foreground">{t('import.common.failureKind', { kind: failure.kind })}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{failure.error}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div>
          <Link className={buttonVariants({ variant: 'outline' })} to={ROOT}>
            <Import className="size-4" />
            {t('import.common.importMore')}
          </Link>
        </div>
      </ImportBody>
    </>
  )
}

/**
 * `/tasks-import/linear` (connect + recent imports) and `/tasks-import/linear/:importId` (one import through its
 * states), a pane in the Tasks area like the Asana import. The URL survives reloads during a long import.
 */
export function LinearImportPage() {
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const { importId } = useParams()
  const query = useLinearImport(workspace.id, importId)
  let content: ReactNode
  if (!importId) {
    content = <ConnectStep workspaceId={workspace.id} />
  } else if (query.data) {
    const item = query.data
    if (item.status === 'scanning') content = <ScanningStep workspaceId={workspace.id} item={item} />
    else if (item.status === 'ready') content = <ChooseStep key={item.id} workspaceId={workspace.id} item={item} />
    else if (item.status === 'queued' || item.status === 'importing') content = <ImportingStep workspaceId={workspace.id} item={item} />
    else if (isFinalImport(item.status)) content = <ResultStep workspaceId={workspace.id} item={item} />
  } else if (query.isError) {
    const missing = query.error instanceof ApiProblem && query.error.status === 404
    content = (
      <>
        <ImportHeader title={t('import.linear.title')} />
        <div className="flex flex-1 flex-col p-6">
          <EmptyState
            icon={Import}
            title={missing ? t('import.common.notFound') : t('import.common.unavailable')}
            description={missing ? t('import.common.notFoundDescription') : t('import.common.unavailableDescription')}
            action={
              <div className="flex gap-2">
                {missing ? null : (
                  <Button type="button" variant="outline" onClick={() => void query.refetch()}>
                    {t('retry')}
                  </Button>
                )}
                <Link className={buttonVariants({ variant: 'outline' })} to={ROOT}>
                  {t('import.common.newImport')}
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
        <ImportHeader title={t('import.linear.title')} />
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground" />
        </div>
      </>
    )
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <Pane>{content}</Pane>
    </div>
  )
}
