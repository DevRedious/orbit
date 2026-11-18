import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Import, Search4 as Search, TickCircle, Warning } from 'reicon-react'
import type { TrelloImport, TrelloImportTree } from '@orbit/api/generated/types.gen'
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
import { TitleTip } from '@/components/common/TitleTip'
import { confirmAction } from '@/components/common/confirmAction'
import { relativeTime } from '@/lib/format'
import { ApiProblem } from '@orbit/api/problem'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { useProjects } from '@/features/tasks/api/projects'
import { IMPORT_STATUS_LABELS, importStatusVariant, isActiveImport, isFinalImport } from '@/features/tasks/api/importStatus'
import { ImportBody, ImportHeader, ImportProgressBar, ImportStat } from '@/features/tasks/components/ImportLayout'
import {
  createTrelloImportRequest,
  trelloCredentialField,
  isTrelloImportInProgress,
  trelloImportErrorMessage,
  reconcileTrelloImport,
  useCancelTrelloImport,
  useTrelloImport,
  useTrelloImportTree,
  useTrelloImports,
  useStartTrelloImport,
} from '@/features/tasks/api/trelloImports'

const POWER_UP_ADMIN_URL = 'https://trello.com/apps/admin'
const ROOT = '/tasks-import/trello'

/** Trello's authorization page for a read-only token that expires in a day, for the given API key. */
function tokenUrl(key: string): string {
  return `https://trello.com/1/authorize?expiration=1day&scope=read&response_type=token&name=Orbit&key=${encodeURIComponent(key)}`
}

/** Step 1: paste a Power-Up API key and a token for it. Also lists the member's recent imports. */
function ConnectStep({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const imports = useTrelloImports(workspaceId)
  const [key, setKey] = useState('')
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const running = imports.data?.find((item) => isActiveImport(item.status))
  const field = trelloCredentialField(error)
  const trimmedKey = key.trim()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const credentials = { key: trimmedKey, token: token.trim() }
    if (!credentials.key || !credentials.token || pending) return
    setPending(true)
    setError(null)
    try {
      const created = await createTrelloImportRequest(apiClient, workspaceId, credentials)
      setKey('')
      setToken('')
      reconcileTrelloImport(queryClient, workspaceId, created)
      navigate(`${ROOT}/${created.id}`)
    } catch (caught) {
      setError(caught)
      if (isTrelloImportInProgress(caught)) void imports.refetch()
    } finally {
      setPending(false)
    }
  }

  const fieldError = (name: 'key' | 'token') =>
    field === name ? (
      <p id={`trello-${name}-error`} role="alert" className="text-sm text-destructive">
        {trelloImportErrorMessage(error)}
      </p>
    ) : null

  return (
    <>
      <ImportHeader title={t('import.trello.title')} />
      <ImportBody>
        <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <TitleTip
            as="h2"
            title={t('import.trello.connect')}
            text={t('import.trello.connectHint')}
            className="text-sm font-semibold text-foreground"
          />
          <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)} autoComplete="off">
            <div className="grid gap-1.5">
              <Label htmlFor="trello-key">{t('import.trello.keyLabel')}</Label>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm text-muted-foreground">
                <li>
                  <Trans t={t} i18nKey="import.trello.keyStep1" components={{ docLink: <a className="text-primary underline underline-offset-2" href={POWER_UP_ADMIN_URL} target="_blank" rel="noreferrer noopener" />, b: <span className="font-medium text-foreground" /> }} />
                </li>
                <li>
                  <Trans t={t} i18nKey="import.trello.keyStep2" components={{ b: <span className="font-medium text-foreground" /> }} />
                </li>
                <li>
                  <Trans t={t} i18nKey="import.trello.keyStep3" components={{ b: <span className="font-medium text-foreground" /> }} />
                </li>
              </ol>
              <PasswordInput
                id="trello-key"
                name="trello-key"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                value={key}
                aria-invalid={field === 'key' ? true : undefined}
                aria-describedby={field === 'key' ? 'trello-key-error' : undefined}
                onChange={(event) => {
                  setKey(event.target.value)
                  if (field === 'key') setError(null)
                }}
              />
              {fieldError('key')}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="trello-token">{t('import.trello.tokenLabel')}</Label>
              <p className="text-sm text-muted-foreground">
                {trimmedKey ? (
                  <a className="text-primary underline underline-offset-2" href={tokenUrl(trimmedKey)} target="_blank" rel="noreferrer noopener">
                    {t('import.trello.generateToken')}
                  </a>
                ) : (
                  <span>{t('import.trello.generateTokenFirst')}</span>
                )}{' '}
                {t('import.trello.tokenHelp')}
              </p>
              <PasswordInput
                id="trello-token"
                name="trello-token"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                value={token}
                aria-invalid={field === 'token' ? true : undefined}
                aria-describedby={field === 'token' ? 'trello-token-error' : undefined}
                onChange={(event) => {
                  setToken(event.target.value)
                  if (field === 'token') setError(null)
                }}
              />
              {fieldError('token')}
            </div>
            {error && !field ? (
              <p role="alert" className="text-sm text-destructive">
                {trelloImportErrorMessage(error)}{' '}
                {isTrelloImportInProgress(error) && running ? (
                  <Link className="text-primary underline underline-offset-2" to={`${ROOT}/${running.id}`}>
                    {t('import.common.openRunning')}
                  </Link>
                ) : null}
              </p>
            ) : null}
            <div>
              <Button type="submit" disabled={!trimmedKey || !token.trim() || pending}>
                {pending ? <Spinner className="size-4" /> : null}
                {t('import.trello.findBoards')}
              </Button>
            </div>
          </form>
        </section>
        <RecentImports imports={imports.data} />
      </ImportBody>
    </>
  )
}

function RecentImports({ imports }: { imports: TrelloImport[] | undefined }) {
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
            <span className="min-w-0 flex-1 truncate text-foreground">{item.trello_user_name || 'Trello'}</span>
            {item.progress.total > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('import.trello.recentProgress', { done: item.progress.done, total: item.progress.total })}
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

function useCancel(workspaceId: string, item: TrelloImport) {
  const { t } = useTranslation('tasks')
  const cancel = useCancelTrelloImport(workspaceId)
  const request = async (started: boolean) => {
    const confirmed = await confirmAction({
      title: started ? t('import.common.cancelStartedTitle') : t('import.common.cancelTitle'),
      description: started
        ? t('import.trello.cancelStartedDescription')
        : t('import.trello.cancelDescription'),
      confirmLabel: t('import.common.cancelImport'),
      cancelLabel: t('import.common.keepGoing'),
      danger: true,
    })
    if (!confirmed) return
    cancel.mutate({ importId: item.id }, { onError: (error) => toast.error(trelloImportErrorMessage(error)) })
  }
  return { request, pending: cancel.isPending }
}

/** Step 2: the scan job lists the boards the token can see. */
function ScanningStep({ workspaceId, item }: { workspaceId: string; item: TrelloImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  return (
    <>
      <ImportHeader title={t('import.trello.title')} detail={item.trello_user_name} />
      <ImportBody>
        <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
          <Spinner className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t('import.trello.scanning')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('import.trello.scanningDescription')}</p>
          <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        </div>
      </ImportBody>
    </>
  )
}

/** Step 3: pick boards, grouped by Trello Workspace. Open boards start selected, archived ones do not. */
function BoardChooser({ workspaceId, item, tree }: { workspaceId: string; item: TrelloImport; tree: TrelloImportTree }) {
  const { t } = useTranslation('tasks')
  const boards = useMemo(() => tree.workspaces.flatMap((group) => group.boards), [tree.workspaces])
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(boards.filter((board) => !board.archived).map((board) => board.id)))
  const [query, setQuery] = useState('')
  const start = useStartTrelloImport(workspaceId)
  const needle = query.trim().toLowerCase()
  const groups = useMemo(
    () =>
      tree.workspaces
        .map((group) => ({ ...group, boards: needle ? group.boards.filter((board) => board.name.toLowerCase().includes(needle)) : group.boards }))
        .filter((group) => group.boards.length > 0),
    [tree.workspaces, needle],
  )
  const visible = groups.flatMap((group) => group.boards.map((board) => board.id))
  const count = selected.size
  const cards = boards.filter((board) => selected.has(board.id)).reduce((sum, board) => sum + (board.card_count ?? 0), 0)
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
          {t('import.trello.truncated')}
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
            placeholder={t('import.trello.filter')}
            aria-label={t('import.trello.filter')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
        <div className="flex items-center gap-2 text-[0.8125rem] text-foreground">
          <Checkbox
            aria-label={t('import.trello.selectAll')}
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
        {groups.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{needle ? t('import.trello.noMatch') : t('import.trello.empty')}</p>
        ) : (
          groups.map((group) => {
            const heading = group.id === null ? t('import.trello.otherBoards') : group.name
            return (
              <section key={group.id ?? 'other'} className="flex flex-col gap-1" aria-label={heading}>
                <h2 className="px-2 pt-2 pb-1 text-xs font-semibold text-foreground">{heading}</h2>
                {group.boards.map((board) => (
                  <div
                    key={board.id}
                    className="flex h-8 items-center gap-2 rounded-md px-2 text-[0.8125rem] text-foreground transition-colors duration-150 ease-out hover:bg-sidebar-accent/50"
                  >
                    <Checkbox aria-label={t('import.common.select', { name: board.name })} checked={selected.has(board.id)} onCheckedChange={(checked) => toggle([board.id], checked)} />
                    {/* Clicking the name toggles the row, like the checkbox (the checkbox is the keyboard control). */}
                    <button type="button" tabIndex={-1} className="min-w-0 flex-1 truncate text-left" onClick={() => toggle([board.id], !selected.has(board.id))}>
                      {board.name}
                    </button>
                    {board.archived ? <Badge variant="outline">{t('import.common.archived')}</Badge> : null}
                    {board.card_count === null ? null : (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{t('import.trello.cardCount', { count: board.card_count })}</span>
                    )}
                  </div>
                ))}
              </section>
            )
          })
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t('import.trello.summary')}
        </p>
        <div className="flex flex-col items-end gap-1.5">
          {start.isError ? (
            <p role="alert" className="max-w-96 text-right text-xs text-destructive">
              {trelloImportErrorMessage(start.error)}
            </p>
          ) : null}
          <Button
            type="button"
            className="tabular-nums"
            disabled={count === 0 || start.isPending}
            title={count > 0 ? t('import.trello.about', { count: cards }) : undefined}
            onClick={() => start.mutate({ importId: item.id, boardIds: [...selected] })}
          >
            {t('import.trello.start', { count })}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ChooseStep({ workspaceId, item }: { workspaceId: string; item: TrelloImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  const scan = useTrelloImportTree(workspaceId, item.id)
  return (
    <>
      <ImportHeader
        title={t('import.trello.chooseTitle')}
        detail={item.trello_user_name}
        actions={
          <Button type="button" variant="ghost" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(false)}>
            {t('cancel')}
          </Button>
        }
      />
      {scan.data ? (
        <BoardChooser workspaceId={workspaceId} item={item} tree={scan.data} />
      ) : scan.isError || (scan.isSuccess && !scan.data) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{scan.isError ? trelloImportErrorMessage(scan.error) : t('import.trello.listUnavailable')}</p>
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
function ImportingStep({ workspaceId, item }: { workspaceId: string; item: TrelloImport }) {
  const { t } = useTranslation('tasks')
  const cancel = useCancel(workspaceId, item)
  const { done, total, failed } = item.progress
  return (
    <>
      <ImportHeader title={t('import.trello.title')} detail={item.trello_user_name} />
      <ImportBody>
        <section className="flex flex-col gap-4 py-10" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Spinner className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {item.status === 'queued' ? t('import.common.waiting') : total === 0 ? t('import.trello.reading') : t('import.trello.importing')}
            </p>
          </div>
          <ImportProgressBar done={done + failed} total={total} />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {t('import.trello.progress', { done, total })}
            </span>
            {failed > 0 ? <span className="text-destructive">{t('import.common.failedCount', { count: failed })}</span> : null}
            <span className="flex-1" />
            <Button type="button" variant="outline" size="sm" disabled={cancel.pending} onClick={() => void cancel.request(true)}>
              {t('import.common.cancelImport')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('import.trello.leave')}
          </p>
        </section>
      </ImportBody>
    </>
  )
}

/** Step 5: completed, failed, cancelled or expired. */
function ResultStep({ workspaceId, item }: { workspaceId: string; item: TrelloImport }) {
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
    if (report.checklists_added > 0) notes.push(t('import.trello.notes.checklists', { count: report.checklists_added }))
    if (report.links_added > 0) notes.push(t('import.trello.notes.links', { count: report.links_added }))
    if (report.unmatched_members > 0)
      notes.push(t('import.trello.notes.unmatchedMembers', { count: report.unmatched_members }))
    if (report.archived_lists_skipped > 0)
      notes.push(t('import.trello.notes.archivedLists', { count: report.archived_lists_skipped }))
    if (report.archived_cards_skipped > 0)
      notes.push(t('import.trello.notes.archivedCards', { count: report.archived_cards_skipped }))
    if (report.refused_files > 0)
      notes.push(t('import.trello.notes.refusedFiles', { count: report.refused_files }))
    if (report.missing_files > 0)
      notes.push(t('import.trello.notes.missingFiles', { count: report.missing_files }))
  }
  return (
    <>
      <ImportHeader title={t('import.trello.title')} detail={item.trello_user_name} />
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
            <ImportStat label={t('import.trello.cardsImported')} value={item.progress.done} />
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
                <li key={`${failure.kind}-${failure.trello_id}`} className="flex flex-col gap-0.5 border-b border-border px-1 py-2">
                  <span className="text-[0.8125rem] text-foreground">
                    {failure.title.trim() ? failure.title : t('untitled')}
                    {failure.kind === 'card' ? null : <span className="text-muted-foreground">{t('import.common.failureKind', { kind: failure.kind })}</span>}
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
 * `/tasks-import/trello` (connect + recent imports) and `/tasks-import/trello/:importId` (one import through its
 * states), a pane in the Tasks area like the Asana import. The URL survives reloads during a long import.
 */
export function TrelloImportPage() {
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const { importId } = useParams()
  const query = useTrelloImport(workspace.id, importId)
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
        <ImportHeader title={t('import.trello.title')} />
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
        <ImportHeader title={t('import.trello.title')} />
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
