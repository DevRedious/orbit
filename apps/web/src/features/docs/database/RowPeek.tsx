import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Copy, FolderMove, Link2, Maximize4, MoreH, Trash, Xmark } from 'reicon-react'
import { isPaymentRequired } from '@orbit/api/problem'
import { databaseErrorMessage } from '@orbit/database/errors'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { Tip } from '@/components/common/Tip'
import { isPageNotFound, useDuplicatePage, usePage, usePageTree } from '@/features/docs/api/pages'
import { useTeamspaces } from '@/features/docs/api/teamspaces'
import { DocEditor, type DocEditorControl } from '@/features/docs/components/DocEditor'
import { MoveToDialog } from '@/features/docs/components/MoveToDialog'
import { useMovePageTo, type MoveDestination } from '@/features/docs/useMovePageTo'
import { useDatabase, useTrashRows } from './api'
import { neighborRows } from './databaseLib'
import { SaveAsTemplateItem, TemplateActions, TemplateBar } from './TemplatePeek'

interface RowPeekProps {
  workspaceId: string
  databaseId: string
  rowId: string
  /** The view the peek was opened from. */
  viewId: string
  /** The row ids of that view, in its order: previous and next follow it. */
  order: readonly string[]
  /** A row just created: its title takes the focus. */
  focusTitle: boolean
  /** Shows another row in the peek (previous, next, a duplicate). */
  onShowRow: (rowId: string) => void
  onClose: () => void
}

/** Typing targets and open popups keep their keys: Esc and the row shortcuts only act outside them. */
function inEditor(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"]') !== null
}

/**
 * The side peek of a database row (spec 7.5): a right pane with the row's page (title, properties, comments and its
 * collaborative editor), full screen under 900 px.
 */
export function RowPeek({ workspaceId, databaseId, rowId, viewId, order, focusTitle, onShowRow, onClose }: RowPeekProps) {
  const { t } = useTranslation('database')
  const navigate = useNavigate()
  const page = usePage(workspaceId, rowId)
  const tree = usePageTree(workspaceId)
  const database = useDatabase(workspaceId, databaseId)
  const trashRows = useTrashRows(workspaceId, databaseId)
  const duplicatePage = useDuplicatePage(workspaceId)
  const teamspaces = useTeamspaces(workspaceId)
  const moveTo = useMovePageTo(workspaceId, tree.data ?? [], teamspaces.data)
  const [moveOpen, setMoveOpen] = useState(false)
  const control = useRef<DocEditorControl>(null)
  const { previous, next } = neighborRows(order, rowId)

  const missing = page.isError && isPageNotFound(page.error)
  const foreign = page.data !== undefined && page.data.database_id !== databaseId
  /** The peek edits a row template (spec P2 7.4): its own bar and actions. */
  const template = database.data?.templates?.find((candidate) => candidate.id === rowId)
  const flush = async () => control.current?.flush()
  // Read through a ref: the listeners stay while the neighbors and callbacks change.
  const keys = useRef({ previous, next, onShowRow, onClose })
  useEffect(() => {
    keys.current = { previous, next, onShowRow, onClose }
  })
  // Set once "Move to" sends the row away: the peek then closes without the "does not exist" error.
  const movedAway = useRef(false)
  useEffect(() => {
    if (!missing && !foreign) return
    if (!(foreign && movedAway.current)) toast.error(t('row.gone'))
    keys.current.onClose()
  }, [missing, foreign, t])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || inEditor(event.target)) return
      const current = keys.current
      if (event.key === 'Escape') {
        event.preventDefault()
        current.onClose()
      } else if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        const target = event.key === 'ArrowUp' ? current.previous : current.next
        event.preventDefault()
        if (target) current.onShowRow(target)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const copyLink = () =>
    void navigator.clipboard.writeText(window.location.href).then(
      () => toast.success(t('row.linkCopied')),
      () => toast.error(t('row.copyFailed')),
    )

  const remove = async () => {
    const row = database.data?.rows.find((candidate) => candidate.id === rowId)
    if (!row) return
    // Save a title being typed first: the trash bumps the version the undo restores from.
    await control.current?.flush()
    onClose()
    trashRows.trash([row])
  }

  const duplicate = async () => {
    await control.current?.flush()
    duplicatePage.mutate(
      { pageId: rowId, includeChildren: false },
      {
        onSuccess: (copy) => {
          onShowRow(copy.id)
          toast.success(t('row.duplicated'))
        },
        onError: (error) => {
          if (!isPaymentRequired(error)) toast.error(databaseErrorMessage(error, t('row.duplicateFailed')))
        },
      },
    )
  }

  /** Moves the row out of the database (or into another one); the peek closes when the row has left. */
  const move = async (destination: MoveDestination) => {
    setMoveOpen(false)
    const row = page.data
    if (!row) return
    const flush = async () => (await control.current?.flush()) ?? row.version
    if (await moveTo({ id: rowId, version: row.version, database_id: databaseId }, destination, flush)) movedAway.current = true
  }

  const start = (
    <div className="flex items-center gap-0.5">
      <Tip label={t('row.closeTip')} side="bottom">
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('row.close')} onClick={onClose}>
          <Xmark className="size-4" />
        </Button>
      </Tip>
      <Tip label={t('row.openFullPage')} side="bottom">
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('row.openFullPage')} onClick={() => navigate(`/docs/${rowId}`)}>
          <Maximize4 className="size-4" />
        </Button>
      </Tip>
      <Tip label={t('row.previousTip')} side="bottom">
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('row.previous')} disabled={!previous} onClick={() => previous && onShowRow(previous)}>
          <ChevronUp className="size-4" />
        </Button>
      </Tip>
      <Tip label={t('row.nextTip')} side="bottom">
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('row.next')} disabled={!next} onClick={() => next && onShowRow(next)}>
          <ChevronDown className="size-4" />
        </Button>
      </Tip>
    </div>
  )
  const rowEnd = (
    <>
      <Tip label={t('row.copyLink')} side="bottom">
        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('row.copyLinkLabel')} onClick={copyLink}>
          <Link2 className="size-4" />
        </Button>
      </Tip>
      <DropdownMenu>
        <Tip label={t('row.options')} side="bottom">
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('row.options')} />}>
            <MoreH className="size-4" />
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end" className="w-auto min-w-40">
          <DropdownMenuItem disabled={duplicatePage.isPending} onClick={() => void duplicate()}>
            <Copy className="size-[14px]" />
            {t('row.duplicate')}
          </DropdownMenuItem>
          <SaveAsTemplateItem workspaceId={workspaceId} databaseId={databaseId} rowId={rowId} title={page.data?.title ?? ''} flush={flush} onShowRow={onShowRow} />
          <DropdownMenuItem disabled={!page.data || !teamspaces.data} onClick={() => setMoveOpen(true)}>
            <FolderMove className="size-[14px]" />
            {t('row.moveTo')}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void remove()}>
            <Trash className="size-[14px]" />
            {t('row.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
  const end = template ? (
    <TemplateActions workspaceId={workspaceId} databaseId={databaseId} template={template} flush={flush} onShowRow={onShowRow} onClose={onClose} />
  ) : (
    rowEnd
  )

  return (
    <aside
      aria-label={t('row.label')}
      className="flex h-full min-h-0 w-1/2 min-w-0 shrink-0 animate-in flex-col border-l border-border bg-background duration-150 ease-out fade-in max-[899px]:fixed max-[899px]:inset-0 max-[899px]:z-40 max-[899px]:w-full max-[899px]:border-l-0 max-[899px]:duration-200 max-[899px]:slide-in-from-bottom-2 motion-reduce:animate-none"
      data-row-peek={rowId}
    >
      {template ? <TemplateBar key={`template-${template.id}`} workspaceId={workspaceId} databaseId={databaseId} template={template} /> : null}
      {page.data && !foreign ? (
        <DocEditor
          key={rowId}
          workspaceId={workspaceId}
          page={page.data}
          pages={tree.data ?? []}
          onRequestTrash={() => void remove()}
          controlRef={control}
          peek={{ start, end, viewId, focusTitle, onLeave: onClose }}
        />
      ) : (
        <>
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">{start}</div>
          <div className="flex flex-1 items-center justify-center">
            {page.isError && !missing ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void page.refetch()}>
                {t('row.retry')}
              </Button>
            ) : (
              <Spinner className="text-muted-foreground" />
            )}
          </div>
        </>
      )}
      {moveOpen && page.data && teamspaces.data ? (
        <MoveToDialog
          pages={tree.data ?? []}
          teamspaces={teamspaces.data}
          moving={page.data}
          onPick={(destination) => void move(destination)}
          onClose={() => setMoveOpen(false)}
        />
      ) : null}
    </aside>
  )
}
