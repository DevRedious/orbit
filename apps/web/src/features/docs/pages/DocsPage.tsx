import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { isPaymentRequired } from '@orbit/api/problem'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { DocumentText as FileText, Add as Plus } from 'reicon-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Pane } from '@/components/common/Pane'
import { confirmAction } from '@/components/common/confirmAction'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import {
  isPageNotFound,
  isPageVersionConflict,
  movePageErrorMessage,
  useCreatePage,
  useDuplicatePage,
  useMovePage,
  usePage,
  usePageTree,
  useTrashPage,
} from '@/features/docs/api/pages'
import { useTeamspaces } from '@/features/docs/api/teamspaces'
import { descendantsOf, dropOnSpace, landingPage, pageTitle, spaceKey, spaceLabel, type SpaceKey } from '@/features/docs/pageTree'
import { cn } from 'cn'
import { DocEditor, type DocEditorControl } from '@/features/docs/components/DocEditor'
import { preloadPageEditor } from '@/features/docs/editor/loadPageEditor'
import { DocTree } from '@/features/docs/components/DocTree'
import { DocPageActionsContext, type DocPageActions } from '@/features/docs/pageActions'
import { NotionImportPane } from './NotionImportPane'
import { PageTrashPane } from './PageTrashPane'

/** The docs page's main pane (hidden on phones while the page list shows). */
function DocsPane({ className, ...props }: ComponentProps<typeof Pane>) {
  return <Pane className={cn('max-[899px]:group-data-[view=index]/docs:hidden', className)} {...props} />
}

/** Desktop lands on the first page; phones show the page list first (the tree is the whole screen there). */
function landsOnFirstPage() {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 900px)').matches
}

export function DocsPage({ view = 'page' }: { view?: 'page' | 'trash' | 'import' }) {
  const { t } = useTranslation('docs')
  const { pageId, importId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { workspace } = useWorkspace()
  const canDeleteTeamspaces = useCan('teamspaces.delete')
  const tree = usePageTree(workspace.id)
  const teamspaces = useTeamspaces(workspace.id)
  // The open page was trashed (here or by someone else) and we are leaving it. Navigations run as transitions, so
  // stop observing its query right away: a realtime refresh in between would refetch it (404) for nothing.
  // Tied to the location entry, so opening the same id again later (e.g. after a restore) loads it normally.
  const [gone, setGone] = useState<{ id: string; key: string } | null>(null)
  const leaving = gone !== null && gone.id === pageId && gone.key === location.key
  const page = usePage(workspace.id, view === 'page' && !leaving ? pageId : undefined)
  const createPage = useCreatePage(workspace.id)
  const trashPage = useTrashPage(workspace.id)
  const movePage = useMovePage(workspace.id)
  const duplicatePage = useDuplicatePage(workspace.id)
  const editorControl = useRef<DocEditorControl>(null)
  const pages = tree.data ?? []
  const activeId = view === 'page' ? (pageId ?? null) : null
  // The trash request is async: read the open page when it finishes, not when it started.
  const activeIdRef = useRef(activeId)
  const locationKeyRef = useRef(location.key)
  useEffect(() => {
    activeIdRef.current = activeId
    locationKeyRef.current = location.key
  })
  // Download the editor while the page itself loads, not after its socket has synced.
  useEffect(() => {
    preloadPageEditor()
  }, [])
  const markGone = (id: string) => setGone({ id, key: locationKeyRef.current })

  const createFirstPage = () => {
    createPage.mutate(
      {},
      {
        onSuccess: (created) => navigate(`/docs/${created.id}`),
        onError: (error) => {
          if (!isPaymentRequired(error)) toast.error(t('createPageFailed'))
        },
      },
    )
  }

  /** Confirm, save the open editor if it is affected, trash the subtree, then leave it if it was open. */
  const requestTrash = async (targetId: string) => {
    const target = pages.find((item) => item.id === targetId)
    if (!target) return
    const descendants = descendantsOf(pages, targetId)
    const confirmed = await confirmAction({
      title: t('trashConfirm.title', { title: pageTitle(target) }),
      description: descendants.length > 0 ? t('trashConfirm.withChildren', { count: descendants.length }) : t('trashConfirm.description'),
      confirmLabel: t('pageMenu.moveToTrash'),
      danger: true,
    })
    if (!confirmed) return

    const affected = new Set([targetId, ...descendants.map((item) => item.id)])
    const isAffected = (id: string | null) => id !== null && affected.has(id)
    // Capture the affected editor now: by the time the request finishes another page may be open.
    const control = isAffected(activeIdRef.current) ? editorControl.current : null
    let version = target.version
    if (control) {
      const saved = await control.flush()
      if (activeIdRef.current === targetId) version = saved
    }
    // The open page's co-editing socket closes with "page gone" once the trash commits; that is us, not news.
    const undoExpectGone = control?.expectGone()
    trashPage.mutate(
      { pageId: targetId, version },
      {
        onSuccess: () => {
          control?.dispose()
          if (isAffected(activeIdRef.current)) {
            markGone(activeIdRef.current!)
            navigate(target.parent_id ? `/docs/${target.parent_id}` : '/docs', { replace: true })
          }
          toast.success(t('trashConfirm.moved'))
        },
        onError: (error) => {
          undoExpectGone?.()
          if (!isPageVersionConflict(error)) toast.error(t('trashConfirm.failed'))
        },
      },
    )
  }

  /** Page menu "Move to": the page (and its sub-pages) becomes the last root page of `space`. */
  const requestMoveToSpace = async (targetId: string, space: SpaceKey) => {
    const target = pages.find((item) => item.id === targetId)
    const move = target ? dropOnSpace(pages, targetId, space) : null
    if (!target || !move) return
    // Save pending edits first so the move is sent on the page's latest version.
    let version = target.version
    if (activeIdRef.current === targetId && editorControl.current) version = await editorControl.current.flush()
    movePage.mutate(
      { pageId: targetId, version, ...move },
      {
        onSuccess: () => {
          if (spaceKey(target) !== space) toast.success(t('movedTo', { space: spaceLabel(space, teamspaces.data) }))
        },
        onError: (error) => {
          if (!isPageVersionConflict(error)) toast.error(movePageErrorMessage(error))
        },
      },
    )
  }

  /** Save the open editor if the copy includes it, duplicate, then open the copy. */
  const requestDuplicate = async (targetId: string, includeChildren: boolean) => {
    const target = pages.find((item) => item.id === targetId)
    if (!target) return
    const copied = new Set([targetId, ...(includeChildren ? descendantsOf(pages, targetId).map((item) => item.id) : [])])
    if (activeIdRef.current && copied.has(activeIdRef.current) && editorControl.current) await editorControl.current.flush()
    duplicatePage.mutate(
      { pageId: targetId, includeChildren },
      {
        onSuccess: (copy) => {
          navigate(`/docs/${copy.id}`)
          toast.success(t('duplicated', { title: pageTitle(target) }))
        },
        onError: (error) => {
          if (!isPaymentRequired(error)) toast.error(t('duplicateFailed'))
        },
      },
    )
  }
  const pageActions: DocPageActions = {
    duplicate: (id, includeChildren) => void requestDuplicate(id, includeChildren),
  }

  let content
  if (view === 'trash') {
    content = <PageTrashPane workspaceId={workspace.id} />
  } else if (view === 'import') {
    content = <NotionImportPane key={importId ?? 'new'} workspaceId={workspace.id} importId={importId} />
  } else if (!pageId) {
    // The landing order needs the default teamspace; a failed teamspace list falls back to private / any page.
    const spacesKnown = !teamspaces.isPending
    const first = spacesKnown ? landingPage(pages, teamspaces.data) : null
    if (first && landsOnFirstPage()) return <Navigate to={`/docs/${first.id}`} replace />
    content = (
      <DocsPane>
        {tree.isPending || !spacesKnown ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 flex-col p-6">
            {first ? (
              <EmptyState icon={FileText} title={t('landing.selectPage')} description={t('landing.selectPageHint')} />
            ) : (
              <EmptyState
                icon={FileText}
                title={t('landing.firstPage')}
                description={t('landing.firstPageHint')}
                action={
                  <Button type="button" disabled={createPage.isPending} onClick={createFirstPage}>
                    <Plus className="size-4" />
                    {t('landing.createPage')}
                  </Button>
                }
              />
            )}
          </div>
        )}
      </DocsPane>
    )
  } else if (page.data) {
    content = (
      <DocEditor
        key={page.data.id}
        workspaceId={workspace.id}
        page={page.data}
        pages={pages}
        teamspaces={teamspaces.data}
        controlRef={editorControl}
        onRequestTrash={(id) => void requestTrash(id)}
        onRequestMove={(id, space) => void requestMoveToSpace(id, space)}
        onGone={markGone}
      />
    )
  } else if (page.isError) {
    const missing = isPageNotFound(page.error)
    content = (
      <DocsPane>
        <div className="flex flex-1 flex-col p-6">
          <EmptyState
            icon={FileText}
            title={missing ? t('pageError.notFound') : t('pageError.unavailable')}
            description={missing ? t('pageError.notFoundHint') : t('pageError.unavailableHint')}
            action={
              <div className="flex gap-2">
                {missing ? null : (
                  <Button type="button" variant="outline" onClick={() => void page.refetch()}>
                    {t('retry')}
                  </Button>
                )}
                <Link className={buttonVariants({ variant: 'outline' })} to="/docs">
                  {t('pageError.backToDocs')}
                </Link>
              </div>
            }
          />
        </div>
      </DocsPane>
    )
  } else {
    content = (
      <DocsPane>
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="text-muted-foreground" />
        </div>
      </DocsPane>
    )
  }

  return (
    <DocPageActionsContext.Provider value={pageActions}>
      <div
        className="group/docs flex min-h-0 min-w-0 flex-1 overflow-hidden bg-card"
        data-view={view !== 'page' || pageId ? 'doc' : 'index'}
      >
        <DocTree
          key={workspace.id}
          workspaceId={workspace.id}
          pages={tree.data}
          isPending={tree.isPending}
          isError={tree.isError}
          onRetry={() => void tree.refetch()}
          activeId={activeId}
          trashActive={view === 'trash'}
          canDeleteTeamspaces={canDeleteTeamspaces}
          onTrash={(id) => void requestTrash(id)}
        />
        {content}
      </div>
    </DocPageActionsContext.Provider>
  )
}
