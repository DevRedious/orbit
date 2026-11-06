import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
import { Suspense, useMemo, useRef, useState } from 'react'
import { Copy, Edit as Pencil, Trash as Trash2 } from 'reicon-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Tip } from '@/components/common/Tip'
import { Kbd } from '@/components/ui/kbd'
import { UserAvatar } from '@/components/common/UserAvatar'
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal'
import { Attachments } from '@/components/common/Attachments'
import { contentEquals } from '@/features/docs/editor/content'
import { uploadInlineFile } from '@/features/tasks/api/inlineFiles'
import { commentSaveAction, isEmptyRichText } from '@/features/tasks/lib/richText'
import { useNearViewport } from '@/features/tasks/lib/useNearViewport'
import { renderMarkdownBlocks } from '@/lib/markdown'
import { buildMentionTokens } from '@/lib/mentions'
// Type-only import: erased at build time, so the BlockNote chunk stays lazy.
import type { PageEditorHandle } from '@/features/docs/editor/PageEditor'
import { EditorFallback, PageEditor } from './lazyEditor'
import type { TaskComment, TaskViewState } from '@/features/tasks/api/models'
import { useDeleteTaskComment, useUpdateTaskComment } from '@/features/tasks/api/tasks'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { agoLabel } from '@/features/tasks/tasksLib'
import { ProfileTrigger } from '@/components/common/ProfileTrigger'

interface CommentItemProps {
  state: TaskViewState
  taskId: string
  comment: TaskComment
  reply?: boolean
}

/** A task comment with author, timestamp, body, and a compact hover action row. */
export function CommentItem({ state, taskId, comment, reply }: CommentItemProps) {
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const updateComment = useUpdateTaskComment(workspace.id, taskId)
  const deleteComment = useDeleteTaskComment(workspace.id, taskId)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const editorRef = useRef<PageEditorHandle>(null)
  /** Whether the open edit changed anything (an old markdown comment is not rewritten by a plain Save). */
  const dirty = useRef(false)
  /** A saved edit shown until the server's new version arrives (no flash of the old text). */
  const [saved, setSaved] = useState<{ version: number; content: unknown[] } | null>(null)
  const shown = saved?.version === comment.version ? saved.content : null
  const author = comment.authorServiceAccountName ? undefined : state.users.find((u) => u.id === comment.authorId)
  const name = comment.authorServiceAccountName || author?.name || t('someone')
  const mentions = useMemo(() => ({ members: state.users, candidates: state.users.filter((user) => !user.suspended), privatePage: false }), [state.users])
  const fileScope = useMemo(() => ({ workspaceId: workspace.id, taskId }), [workspace.id, taskId])
  const [bodyRef, nearScreen] = useNearViewport<HTMLDivElement>()
  const mentionTokens = useMemo(() => buildMentionTokens(state.users, []), [state.users])
  const hasBody = shown !== null || (comment.bodyJson ? !isEmptyRichText(comment.bodyJson) : comment.body.trim() !== '')

  const startEdit = () => {
    dirty.current = false
    setEditing(true)
  }
  const commitEdit = () => {
    const content = editorRef.current?.getContent() ?? []
    const changed = dirty.current && !contentEquals(content, shown ?? comment.bodyJson)
    const action = commentSaveAction({ content, changed, hasAttachments: (comment.attachments?.length ?? 0) > 0 })
    if (action === 'confirm-delete') {
      setConfirmDelete(true)
      return
    }
    if (action === 'close' && changed && isEmptyRichText(content)) {
      toast.info(t('comments.keepsText'))
    }
    if (action === 'save') {
      setSaved({ version: comment.version, content })
      updateComment.mutate({ commentId: comment.id, bodyJson: content, version: comment.version }, { onError: () => setSaved(null) })
    }
    setEditing(false)
  }

  return (
    <>
      <article
        className={cn(
          'group/comment flex gap-2 px-3.5 py-2.5 transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
          reply && 'border-t',
        )}
        data-reply={reply || undefined}
      >
        <ProfileTrigger userId={author?.id} name={name} kind="avatar" tabIndex={-1} className="flex shrink-0 self-start">
          <UserAvatar user={author} size={20} name={name} />
        </ProfileTrigger>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-5 items-center gap-1.5">
            <ProfileTrigger userId={author?.id} name={name} className="min-w-0 truncate text-[13px] font-semibold text-foreground">
              {name}
            </ProfileTrigger>
            <span className="shrink-0 text-[11px] leading-none text-muted-foreground/70" aria-hidden="true">·</span>
            <time className="shrink-0 text-[11px] font-medium text-muted-foreground" dateTime={comment.createdAt}>
              {agoLabel(comment.createdAt)}
              {comment.editedAt ? ` ${t('comments.edited')}` : ''}
            </time>
            {!editing ? (
              <div className="ml-auto flex shrink-0 items-center gap-px opacity-0 transition-opacity group-hover/comment:opacity-100 group-focus-within/comment:opacity-100 max-[899px]:opacity-100">
                <Tip label={t('comments.copy')}>
                  <Button variant="ghost" size="icon-sm" className="size-6 text-muted-foreground/70" aria-label={t('comments.copy')} onClick={() => void navigator.clipboard.writeText(comment.body).then(() => toast(t('comments.copied')), () => toast.error(t('copyFailed')))}>
                    <Copy className="size-3.5" />
                  </Button>
                </Tip>
                {comment.canEdit ? (
                  <Tip label={t('comments.edit')}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-6 text-muted-foreground/70"
                      aria-label={t('comments.edit')}
                      onClick={startEdit}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </Tip>
                ) : null}
                {comment.canDelete ? (
                  <Tip label={t('comments.delete')}>
                    <Button variant="ghost" size="icon-sm" className="size-6 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive" aria-label={t('comments.delete')} onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </Tip>
                ) : null}
              </div>
            ) : null}
          </div>
          {editing || hasBody ? (
            <div ref={bodyRef} data-realtime-safe={editing ? '' : undefined} className={cn('text-[13px] leading-[19px] text-foreground [overflow-wrap:anywhere]', editing ? 'mt-1.5 rounded-md border px-2 py-1' : 'mt-0.5')}>
              {/* far from the screen: the markdown copy (cheap); the editor mounts once the comment comes near */}
              {!editing && !nearScreen ? renderMarkdownBlocks(comment.body, comment.id, mentionTokens) : (
              <Suspense fallback={<EditorFallback />}>
                <PageEditor
                  // a saved edit brings a new version: start from the stored content again
                  key={`${comment.id}:${comment.version}:${editing}:${shown ? 'saved' : ''}`}
                  ref={editorRef}
                  pageId={`comment:${comment.id}`}
                  profile="task"
                  fileScope={fileScope}
                  initialContent={shown ?? comment.bodyJson ?? undefined}
                  initialMarkdown={comment.body}
                  editable={editing}
                  onChange={editing ? () => { dirty.current = true } : undefined}
                  submitShortcut={editing ? commitEdit : undefined}
                  onEscape={editing ? () => setEditing(false) : undefined}
                  uploadFile={editing ? (file) => uploadInlineFile(workspace.id, taskId, file) : undefined}
                  mentions={mentions}
                  sideMenu={false}
                  ariaLabel={editing ? t('comments.edit') : t('composer.comment')}
                />
              </Suspense>
              )}
            </div>
          ) : null}
          {editing ? (
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span><Trans t={t} i18nKey="comments.editHint" components={{ kbd: <Kbd className="h-4 text-[11px]" />, b: <b className="text-foreground" /> }} /></span>
              <Button variant="ghost" size="xs" className="ml-auto" onClick={() => setEditing(false)}>{t('cancel')}</Button>
              <Button size="xs" onClick={commitEdit}>{t('save')}</Button>
            </div>
          ) : null}
          {comment.attachments && comment.attachments.length > 0 ? (
            <Attachments attachments={comment.attachments} hasTextContent={hasBody} />
          ) : null}
        </div>
      </article>

      {confirmDelete ? (
        <ConfirmDeleteModal
          title={t('comments.deleteTitle')}
          description={reply ? t('comments.deleteReply') : t('comments.deleteThread')}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            deleteComment.mutate({ commentId: comment.id, version: comment.version })
            setConfirmDelete(false)
          }}
        />
      ) : null}
      {updateComment.isError ? <p role="alert" className="text-xs text-destructive">{t('comments.updateFailed')} <Button variant="ghost" onClick={() => updateComment.variables && updateComment.mutate(updateComment.variables)}>{t('retry')}</Button></p> : null}
      {deleteComment.isError ? <p role="alert" className="text-xs text-destructive">{t('comments.deleteFailed')} <Button variant="ghost" onClick={() => deleteComment.variables && deleteComment.mutate(deleteComment.variables)}>{t('retry')}</Button></p> : null}
    </>
  )
}
