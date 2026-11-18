import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Import, Search4 as Search, TickCircle, Warning } from 'reicon-react'
import type { AsanaImport, AsanaImportProject, AsanaImportTree } from '@orbit/api/generated/types.gen'
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
import { i18n } from '@/i18n'
import { ApiProblem } from '@orbit/api/problem'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { useProjects } from '@/features/tasks/api/projects'
import { IMPORT_STATUS_LABELS, importStatusVariant as statusVariant, isActiveImport, isFinalImport } from '@/features/tasks/api/importStatus'
import { ImportBody as Body, ImportHeader, ImportProgressBar as ProgressBar, ImportStat as Stat } from '@/features/tasks/components/ImportLayout'
import {
  asanaImportErrorMessage,
  createAsanaImportRequest,
  isAsanaImportInProgress,
  reconcileAsanaImport,
  useAsanaImport,
  useAsanaImportTree,
  useAsanaImports,
  useCancelAsanaImport,
  useStartAsanaImport,
} from '@/features/tasks/api/asanaImports'

const TOKEN_URL = 'https://app.asana.com/0/my-apps'

/** Step 1: paste a personal access token. Also lists the member's recent imports. */
function ConnectStep({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const imports = useAsanaImports(workspaceId)
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
      const created = await createAsanaImportRequest(apiClient, workspaceId, value)
      setToken('')
      reconcileAsanaImport(queryClient, workspaceId, created)
      navigate(`/tasks-import/${created.id}`)
    } catch (caught) {
      setError(caught)
      if (isAsanaImportInProgress(caught)) void imports.refetch()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <ImportHeader title={t('import.asana.title')} />
      <Body>
        <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">{t('import.asana.connect')}</h2>
            <p className="text-sm text-muted-foreground">
              <Trans
                t={t}
                i18nKey="import.asana.connectHelp"
                values={{ url: TOKEN_URL }}
                components={{
                  docLink: <a className="text-primary underline underline-offset-2" href={TOKEN_URL} target="_blank" rel="noreferrer noopener" />,
                  b: <span className="font-medium text-foreground" />,
                }}
              />
            </p>
          </div>
          <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)} autoComplete="off">
            <div className="grid gap-1.5">
              <Label htmlFor="asana-token">{t('import.asana.tokenLabel')}</Label>
              <PasswordInput
                id="asana-token"
                name="asana-token"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                placeholder="2/1200…"
                value={token}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {asanaImportErrorMessage(error)}{' '}
                {isAsanaImportInProgress(error) && running ? (
                  <Link className="text-primary underline underline-offset-2" to={`/tasks-import/${running.id}`}>
                    {t('import.common.openRunning')}
                  </Link>
                ) : null}
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={!token.trim() || pending}>
                {pending ? <Spinner className="size-4" /> : null}
                {t('import.asana.findProjects')}
              </Button>
            </div>
          </form>
        </section>
        <RecentImports imports={imports.data} />
      </Body>
    </>
  )
}

function RecentImports({ imports }: { imports: AsanaImport[] | undefined }) {
  const { t } = useTranslation('tasks')
  if (!imports?.length) return null
  return (
    <section className="flex flex-col gap-2" aria-label={t('import.common.recent')}>
      <h2 className="text-xs font-medium text-muted-foreground">{t('import.common.recent')}</h2>
      <div className="flex flex-col border-t border-border">
        {imports.map((item) => (
          <Link
            key={item.id}
            to={`/tasks-import/${item.id}`}
            className="flex min-h-10 min-w-0 items-center gap-3 border-b border-border px-1 py-1.5 text-[0.8125rem] transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
          >
            <span className="min-w-0 flex-1 truncate text-foreground">{item.asana_user_name || 'Asana'}</span>
            {item.progress.total > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('import.asana.recentProgress', { done: item.progress.done, total: item.progress.total })}
              </span>
            ) : null}
            <Badge variant={statusVariant(item.status)}>{IMPORT_STATUS_LABELS[item.status]}</Badge>
            <span className="w-12 shrink-0 text-right text-xs text-muted-foreground" title={new Date(item.created_at).toLocaleString()}>
              {relativeTime(item.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function useCancel(workspaceId: string, item: AsanaImport) {
  const { t } = useTranslation('tasks')
  const cancel = useCancelAsanaImport(workspaceId)
  const request = async (started: boolean) => {
    const confirmed = await confirmAction({
      title: started ? t('import.common.cancelStartedTitle') : t('import.common.cancelTitle'),
      description: started
        ? t('import.asana.cancelStartedDescription')
        : t('import.asana.cancelDescription'),
      confirmLabel: t('import.common.cancelImport'),
      cancelLabel: t('import.common.keepGoing'),
      danger: true,
    })
    if (!confirmed) return
    cancel.mutate({ importId: item.id }, { onError: (error) => toast.error(asanaImportErrorMessage(error)) })
  }
  return { request, pending: cancel.isPending }
}

/** Step 2: the scan job lists the workspaces and projects the token can see. */
function ScanningStep({ workspaceId, item }: { workspaceId: string; item: AsanaImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  return (
    <>
      <ImportHeader title={t('import.asana.title')} detail={item.asana_user_name} />
      <Body>
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
          <Spinner className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t('import.asana.scanning')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('import.asana.scanningDescription')}</p>
          <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        </div>
      </Body>
    </>
  )
}

/** One workspace's projects grouped by team, teams in the order the scan sorted them. */
function groupByTeam(projects: AsanaImportProject[]): { team: string; projects: AsanaImportProject[] }[] {
  const groups = new Map<string, AsanaImportProject[]>()
  for (const project of projects) {
    const team = project.team_name ?? i18n.t('tasks:import.asana.noTeam')
    groups.set(team, [...(groups.get(team) ?? []), project])
  }
  return [...groups].map(([team, list]) => ({ team, projects: list }))
}

function checkState(gids: string[], selected: ReadonlySet<string>): { checked: boolean; indeterminate: boolean } {
  const count = gids.filter((gid) => selected.has(gid)).length
  return { checked: count > 0 && count === gids.length, indeterminate: count > 0 && count < gids.length }
}

/** Step 3: pick projects. Active projects start selected, archived ones do not. */
function ProjectChooser({ workspaceId, item, tree }: { workspaceId: string; item: AsanaImport; tree: AsanaImportTree }) {
  const { t } = useTranslation('tasks')
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(tree.workspaces.flatMap((workspace) => workspace.projects.filter((project) => !project.archived).map((project) => project.gid))),
  )
  const [query, setQuery] = useState('')
  const start = useStartAsanaImport(workspaceId)
  const needle = query.trim().toLowerCase()
  const workspaces = useMemo(
    () =>
      tree.workspaces
        .map((workspace) => ({
          ...workspace,
          projects: needle
            ? workspace.projects.filter((project) => `${project.name} ${project.team_name ?? ''}`.toLowerCase().includes(needle))
            : workspace.projects,
        }))
        .filter((workspace) => workspace.projects.length > 0),
    [tree.workspaces, needle],
  )
  const visible = workspaces.flatMap((workspace) => workspace.projects.map((project) => project.gid))
  const count = selected.size
  const toggle = (gids: string[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      for (const gid of gids) {
        if (on) next.add(gid)
        else next.delete(gid)
      }
      return next
    })
  const all = checkState(visible, selected)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tree.truncated ? (
        <p role="status" className="flex items-start gap-2 border-b border-border bg-amber-500/5 px-4 py-2 text-xs text-foreground">
          <Warning className="mt-px size-3.5 shrink-0 text-amber-600" />
          {t('import.asana.truncated')}
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
            placeholder={t('import.asana.filter')}
            aria-label={t('import.asana.filter')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        <div className="flex items-center gap-2 text-[0.8125rem] text-foreground">
          <Checkbox
            aria-label={t('import.asana.selectAll')}
            checked={all.checked}
            indeterminate={all.indeterminate}
            disabled={visible.length === 0}
            onCheckedChange={() => toggle(visible, !all.checked)}
          />
          <button type="button" tabIndex={-1} disabled={visible.length === 0} onClick={() => toggle(visible, !all.checked)}>
            {t('import.common.selectAll')}
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {workspaces.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{needle ? t('import.asana.noMatch') : t('import.asana.empty')}</p>
        ) : (
          workspaces.map((workspace) => (
            <section key={workspace.gid} className="flex flex-col gap-1 pb-3" aria-label={workspace.name}>
              <h2 className="px-2 pt-2 text-xs font-semibold text-foreground">{workspace.name}</h2>
              {groupByTeam(workspace.projects).map((group) => {
                const gids = group.projects.map((project) => project.gid)
                const state = checkState(gids, selected)
                return (
                  <div key={group.team} className="flex flex-col">
                    <div className="flex h-8 items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
                      <Checkbox
                        aria-label={t('import.asana.selectTeam', { team: group.team })}
                        checked={state.checked}
                        indeterminate={state.indeterminate}
                        onCheckedChange={() => toggle(gids, !state.checked)}
                      />
                      <button type="button" tabIndex={-1} className="min-w-0 truncate" onClick={() => toggle(gids, !state.checked)}>
                        {group.team}
                      </button>
                    </div>
                    {group.projects.map((project) => (
                      <div
                        key={project.gid}
                        className="flex h-8 items-center gap-2 rounded-md pr-2 pl-8 text-[0.8125rem] text-foreground transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
                      >
                        <Checkbox
                          aria-label={t('import.common.select', { name: project.name })}
                          checked={selected.has(project.gid)}
                          onCheckedChange={(checked) => toggle([project.gid], checked)}
                        />
                        {/* Clicking the name toggles the row, like the checkbox (the checkbox is the keyboard control). */}
                        <button
                          type="button"
                          tabIndex={-1}
                          className="min-w-0 flex-1 truncate text-left"
                          onClick={() => toggle([project.gid], !selected.has(project.gid))}
                        >
                          {project.name}
                        </button>
                        {project.archived ? <Badge variant="outline">{t('import.common.archived')}</Badge> : null}
                      </div>
                    ))}
                  </div>
                )
              })}
            </section>
          ))
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t('import.asana.summary')}
        </p>
        <div className="flex flex-col items-end gap-1.5">
          {start.isError ? (
            <p role="alert" className="max-w-96 text-right text-xs text-destructive">
              {asanaImportErrorMessage(start.error)}
            </p>
          ) : null}
          <Button
            type="button"
            className="tabular-nums"
            disabled={count === 0 || start.isPending}
            onClick={() => start.mutate({ importId: item.id, projectGids: [...selected] })}
          >
            {t('import.asana.start', { count })}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChooseStep({ workspaceId, item }: { workspaceId: string; item: AsanaImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  const scan = useAsanaImportTree(workspaceId, item.id)
  return (
    <>
      <ImportHeader
        title={t('import.asana.chooseTitle')}
        detail={item.asana_user_name}
        actions={
          <Button type="button" variant="ghost" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        }
      />
      {scan.data ? (
        <ProjectChooser workspaceId={workspaceId} item={item} tree={scan.data} />
      ) : scan.isError || (scan.isSuccess && !scan.data) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{scan.isError ? asanaImportErrorMessage(scan.error) : t('import.asana.listUnavailable')}</p>
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
function ImportingStep({ workspaceId, item }: { workspaceId: string; item: AsanaImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  const { done, total, failed } = item.progress
  return (
    <>
      <ImportHeader title={t('import.asana.title')} detail={item.asana_user_name} />
      <Body>
        <section className="flex flex-col gap-4 py-10" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Spinner className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {item.status === 'queued' ? t('import.common.waiting') : total === 0 ? t('import.asana.reading') : t('import.asana.importing')}
            </p>
          </div>
          <ProgressBar done={done + failed} total={total} />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {t('import.asana.progress', { done, total })}
            </span>
            {failed > 0 ? <span className="text-destructive">{t('import.common.failedCount', { count: failed })}</span> : null}
            <span className="flex-1" />
            <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(true)}>
              {t('import.common.cancelImport')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('import.asana.leave')}
          </p>
        </section>
      </Body>
    </>
  )
}

/** Step 5: completed, failed, cancelled or expired. */
function ResultStep({ workspaceId, item }: { workspaceId: string; item: AsanaImport }) {
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
    if (report.dependencies_linked > 0) notes.push(t('import.asana.notes.dependencies', { count: report.dependencies_linked }))
    if (report.links_added > 0) notes.push(t('import.asana.notes.links', { count: report.links_added }))
    if (report.unmatched_assignees > 0)
      notes.push(t('import.asana.notes.unmatchedAssignees', { count: report.unmatched_assignees }))
    if (report.missing_files > 0) notes.push(t('import.asana.notes.missingFiles', { count: report.missing_files }))
    if (report.skipped_subtasks > 0) notes.push(t('import.asana.notes.skippedSubtasks', { count: report.skipped_subtasks }))
  }
  return (
    <>
      <ImportHeader title={t('import.asana.title')} detail={item.asana_user_name} />
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
        </section>
        {report ? (
          <div className="grid grid-cols-4 gap-2 max-[599px]:grid-cols-2">
            <Stat label={t('import.asana.tasksImported')} value={item.progress.done} />
            <Stat label={t('import.common.comments')} value={report.comments_imported} />
            <Stat label={t('import.common.files')} value={report.files_imported} />
            <Stat label={t('import.common.failed')} value={item.progress.failed} />
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
                <li key={`${failure.kind}-${failure.asana_gid}`} className="flex flex-col gap-0.5 border-b border-border px-1 py-2">
                  <span className="text-[0.8125rem] text-foreground">
                    {failure.title.trim() ? failure.title : t('untitled')}
                    {failure.kind === 'project' ? <span className="text-muted-foreground">{t('import.asana.failedProject')}</span> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{failure.error}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div>
          <Link className={buttonVariants({ variant: 'outline' })} to="/tasks-import">
            <Import className="size-4" />
            {t('import.common.importMore')}
          </Link>
        </div>
      </Body>
    </>
  )
}

/**
 * `/tasks-import` (connect + recent imports) and `/tasks-import/:importId` (one import through its states), a pane
 * in the Tasks area like the task trash. The URL survives reloads during a long import.
 */
export function AsanaImportPage() {
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const { importId } = useParams()
  const query = useAsanaImport(workspace.id, importId)
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
        <ImportHeader title={t('import.asana.title')} />
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
                <Link className={buttonVariants({ variant: 'outline' })} to="/tasks-import">
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
        <ImportHeader title={t('import.asana.title')} />
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
