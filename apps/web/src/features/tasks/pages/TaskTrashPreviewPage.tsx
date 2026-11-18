import { useTranslation } from 'react-i18next'
import { Suspense, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Refresh as RotateCcw, Trash as Trash2 } from 'reicon-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { Pane, PaneHeader, PaneTitle } from '@/components/common/Pane'
import { UserAvatar } from '@/components/common/UserAvatar'
import { confirmAction } from '@/components/common/confirmAction'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { canIn, canPurgeTask } from '@/features/workspaces/permissions'
import { useTeamMembers } from '@/features/workspaces/api'
import { pageMentionCandidates } from '@/features/docs/editor/pageMentions'
import { statusFromRecord, usePurgeProject, useProjects, useProjectTrash, useRestoreProject, useTrashedProject, useTrashedProjectTasks } from '@/features/tasks/api/projects'
import { usePurgeTask, useRestoreTask, useTrashedTask } from '@/features/tasks/api/tasks'
import type { TaskPriority } from '@/features/tasks/api/models'
import { EditorFallback, PageEditor } from '@/features/tasks/components/lazyEditor'
import { LabelPill } from '@/features/tasks/components/TaskLabels'
import { PriorityIcon } from '@/features/tasks/components/PriorityIcon'
import { TaskStatusIcon } from '@/features/tasks/components/TaskStatusIcon'
import { PRIORITY_LABEL, dueDateLabel } from '@/features/tasks/taskMeta'
import { taskPath } from '@/lib/taskLinks'
import { loadFailed } from '@/lib/connection'
import { trashIdentifier, trashedNotice } from '@orbit/api/trash'

const TRASH = '/tasks-trash'

/** `/tasks-trash/task/:taskId`: a trashed task, read-only, with Restore and Delete forever. */
export function TrashedTaskPage() {
  const { taskId = '' } = useParams()
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const navigate = useNavigate()
  const task = useTrashedTask(workspace.id, taskId)
  const liveProjects = useProjects(workspace.id)
  const trashedProjects = useProjectTrash(workspace.id)
  const members = useTeamMembers(workspace.id)
  const restore = useRestoreTask(workspace.id)
  const purge = usePurgeTask(workspace.id)
  if (loadFailed(task)) return <Gone kind="task" />
  // blank until every query settles, so the view does not arrive in pieces
  if (!task.data || liveProjects.isPending || trashedProjects.isPending || members.isPending) return <PreviewPane title="" />
  const record = task.data
  const trashedProject = trashedProjects.data?.find((project) => project.id === record.project_id)
  const project = trashedProject ?? liveProjects.data?.find((item) => item.id === record.project_id)
  const identifier = trashIdentifier(record, () => project?.key)
  const nameOf = (userId: string | null) => members.data?.find((member) => member.id === userId)?.name
  const status = statusFromRecord(record.status)
  const busy = restore.isPending || purge.isPending
  const canPurge = canPurgeTask(workspace, record.project_id)
  const requestPurge = async () => {
    const confirmed = await confirmAction({
      title: t('trash.purgeTitle', { name: record.title || t('trash.untitledTask') }),
      description: t('trash.purgeTaskAndSubIssues'),
      confirmLabel: t('trash.deleteForever'),
      danger: true,
    })
    if (confirmed) purge.mutate(record.id, { onSuccess: () => navigate(TRASH) })
  }
  const banner = trashedProject ? (
    <TrashBanner text={t('trash.projectInTrash', { name: trashedProject.name })}>
      <Button variant="outline" size="sm" onClick={() => navigate(`${TRASH}/project/${trashedProject.id}`)}>{t('trash.openProject')}</Button>
    </TrashBanner>
  ) : (
    <TrashBanner text={trashedNotice('task', nameOf(record.deleted_by), record.deleted_at ?? record.updated_at)}>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => restore.mutate({ taskId: record.id, version: record.version }, { onSuccess: (restored) => navigate(taskPath({ id: restored.id, number: restored.number, projectKey: project?.key })) })}><RotateCcw className="size-3.5" />{t('trash.restoreTask')}</Button>
      {canPurge ? <Button variant="outline" size="sm" disabled={busy} onClick={() => void requestPurge()}><Trash2 className="size-3.5" />{t('trash.deleteForever')}</Button> : null}
    </TrashBanner>
  )
  const assignees = record.assignee_ids.map((id) => members.data?.find((member) => member.id === id)).filter((member) => member !== undefined)
  return (
    <PreviewPane title={identifier ?? t('detail.task')} banner={banner} error={restore.isError ? t('trash.restoreTaskFailed') : purge.isError ? t('trash.purgeTaskFailed') : null}>
      <h1 className="text-2xl font-semibold break-words">{record.title || t('trash.untitledTask')}</h1>
      <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
        <Property name={t('detail.project')}>{project?.name ?? t('trash.unknownProject')}</Property>
        <Property name={t('menu.status')}><span className="flex items-center gap-1.5"><TaskStatusIcon status={status} />{status.name}</span></Property>
        <Property name={t('menu.priority')}><span className="flex items-center gap-1.5"><PriorityIcon priority={record.priority as TaskPriority} />{PRIORITY_LABEL[record.priority as TaskPriority] ?? record.priority}</span></Property>
        <Property name={t('assignee.title')}>
          {assignees.length > 0 ? <span className="flex flex-wrap items-center gap-3">{assignees.map((member) => <span key={member.id} className="flex items-center gap-1.5"><UserAvatar user={member} size={18} />{member.name}</span>)}</span> : <span className="text-muted-foreground">{t('trash.noAssignee')}</span>}
        </Property>
        <Property name={t('labels.title')}>
          {record.labels.length > 0 ? <span className="flex flex-wrap gap-1.5">{record.labels.map((label) => <LabelPill key={label.id} label={label} />)}</span> : <span className="text-muted-foreground">{t('trash.noLabels')}</span>}
        </Property>
        <Property name={t('menu.dueDate')}>{record.due_at ? dueDateLabel(record.due_at, record.due_start_at) : <span className="text-muted-foreground">{t('trash.noDueDate')}</span>}</Property>
      </dl>
      <div className="mt-6">
        <Suspense fallback={<EditorFallback />}>
          <PageEditor
            pageId={`preview:task:${record.id}`}
            profile="task"
            fileScope={{ workspaceId: workspace.id, taskId: record.id }}
            initialContent={record.description_json ?? undefined}
            initialMarkdown={record.description}
            editable={false}
            mentions={{ members: members.data ?? null, candidates: pageMentionCandidates(members.data ?? [], { teamspace_id: workspace.id }, null), privatePage: false }}
            className="-mx-[54px] min-h-16 max-[899px]:mx-0"
          />
        </Suspense>
      </div>
    </PreviewPane>
  )
}

/** `/tasks-trash/project/:projectId`: a trashed project and its tasks, read-only. */
export function TrashedProjectPage() {
  const { projectId = '' } = useParams()
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const navigate = useNavigate()
  const project = useTrashedProject(workspace.id, projectId)
  const tasks = useTrashedProjectTasks(workspace.id, projectId)
  const members = useTeamMembers(workspace.id)
  const restore = useRestoreProject(workspace.id)
  const purge = usePurgeProject(workspace.id)
  if (loadFailed(project) || loadFailed(tasks)) return <Gone kind="project" />
  if (!project.data || !tasks.data || members.isPending) return <PreviewPane title="" />
  const record = project.data
  const statuses = new Map(record.statuses.map((status) => [status.id, statusFromRecord(status)]))
  const busy = restore.isPending || purge.isPending
  const canPurge = canPurgeTask(workspace, record.id)
  const requestPurge = async () => {
    const confirmed = await confirmAction({
      title: t('trash.purgeTitle', { name: record.name }),
      description: t('trash.purgeProjectDescription'),
      confirmLabel: t('trash.deleteForever'),
      danger: true,
    })
    if (confirmed) purge.mutate(record.id, { onSuccess: () => navigate(TRASH) })
  }
  const deletedBy = members.data?.find((member) => member.id === record.deleted_by)?.name
  return (
    <PreviewPane
      title={record.name}
      banner={
        <TrashBanner text={trashedNotice('project', deletedBy, record.deleted_at ?? record.updated_at)}>
          {canIn(workspace, 'projects.manage', record.id) ? <Button variant="outline" size="sm" disabled={busy} onClick={() => restore.mutate({ projectId: record.id, version: record.version }, { onSuccess: () => navigate(`/tasks?project=${record.id}`) })}><RotateCcw className="size-3.5" />{t('trash.restoreProject')}</Button> : null}
          {canPurge ? <Button variant="outline" size="sm" disabled={busy} onClick={() => void requestPurge()}><Trash2 className="size-3.5" />{t('trash.deleteForever')}</Button> : null}
        </TrashBanner>
      }
      error={restore.isError ? t('trash.restoreProjectFailed') : purge.isError ? t('trash.purgeProjectFailed') : null}
    >
      <h1 className="text-2xl font-semibold break-words">{record.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{record.key} · {t('taskCount', { count: tasks.data.length })}</p>
      {tasks.data.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{t('trash.projectEmpty')}</p> : (
        <ul className="mt-4 border-t">
          {tasks.data.map((task) => {
            const status = statuses.get(task.status_id)
            return (
              <li key={task.id}>
                <Link to={`${TRASH}/task/${task.id}`} className="flex min-h-10 items-center gap-2.5 border-b px-1 py-1.5 text-sm hover:bg-muted/50">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{record.key}-{task.number}</span>
                  <TaskStatusIcon status={status} />
                  <span className="min-w-0 flex-1 truncate">{task.title || t('trash.untitledTask')}</span>
                  {status ? <span className="shrink-0 text-xs text-muted-foreground max-[899px]:hidden">{status.name}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </PreviewPane>
  )
}

function PreviewPane({ title, banner, error, children }: { title: string; banner?: ReactNode; error?: string | null; children?: ReactNode }) {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <Pane>
        <PaneHeader>
          <Button variant="ghost" size="icon-sm" aria-label={t('trash.back')} onClick={() => navigate(TRASH)}><ArrowLeft className="size-4" /></Button>
          <PaneTitle className="min-w-0 flex-1">{title ? <>{t('trash.title')} <span className="text-muted-foreground">/</span> {title}</> : t('trash.title')}</PaneTitle>
        </PaneHeader>
        {banner}
        {error ? <p role="alert" className="px-4 pt-2 text-sm text-destructive">{error}</p> : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-8 max-[899px]:px-4">{children}</div>
        </div>
      </Pane>
    </div>
  )
}

function TrashBanner({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div role="status" data-slot="trash-banner" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-destructive px-4 py-2 text-[0.8125rem] text-white [&_button]:border-white/70 [&_button]:bg-transparent [&_button]:text-white [&_button:hover]:bg-white/15 [&_button:hover]:text-white">
      <span className="min-w-0 text-center">{text}</span>
      <span className="flex shrink-0 gap-2">{children}</span>
    </div>
  )
}

function Property({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{name}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

function Gone({ kind }: { kind: 'task' | 'project' }) {
  const { t } = useTranslation('tasks')
  const navigate = useNavigate()
  return (
    <PreviewPane title="">
      <EmptyState icon={Trash2} title={kind === 'task' ? t('trash.goneTask') : t('trash.goneProject')} description={t('trash.goneDescription')} action={<Button variant="outline" onClick={() => navigate(TRASH)}>{t('trash.back')}</Button>} />
    </PreviewPane>
  )
}
