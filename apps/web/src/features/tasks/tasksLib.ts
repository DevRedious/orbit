import type { StatusCategory, Task, TaskActivity, TaskChange, TaskComment, TaskPriority, TaskStatusDef, TaskViewState } from '@/features/tasks/api/models'
import { relativeTime, shortDate } from '@/lib/format'
import { i18n } from '@/i18n'
import { defaultStatusOf, PRIORITY_LABEL, sortStatuses, statusKeyOf } from './taskMeta'

/** Local quick search (never saved): title, description or identifier contains the text. */
export function quickSearchTasks(tasks: Task[], search: string): Task[] {
  const needle = search.trim().toLowerCase()
  if (!needle) return tasks
  return tasks.filter((task) => [task.title, task.description, task.identifier].some((value) => value.toLowerCase().includes(needle)))
}

/** A status column/group: one status per project merged by key (same category + name). */
export interface StatusGroup {
  key: string
  name: string
  category: StatusCategory
  /** Representative definition (icon color). */
  status: TaskStatusDef
  statusIds: string[]
}

/** Groups for the given statuses (all projects or one), in workflow order, including empty ones. */
export function statusGroups(statuses: TaskStatusDef[], projectId: string | null): StatusGroup[] {
  const groups: StatusGroup[] = []
  for (const status of sortStatuses(projectId ? statuses.filter((s) => s.projectId === projectId) : statuses)) {
    const key = statusKeyOf(status)
    const existing = groups.find((g) => g.key === key)
    if (existing) existing.statusIds.push(status.id)
    else groups.push({ key, name: status.name, category: status.category, status, statusIds: [status.id] })
  }
  return groups
}

/** The status of `projectId` that belongs to a group key; falls back to the project's default status. */
export function resolveStatusId(statuses: TaskStatusDef[], projectId: string, key: string | null): string | undefined {
  const match = key ? statuses.find((s) => s.projectId === projectId && statusKeyOf(s) === key) : undefined
  return (match ?? defaultStatusOf(statuses, projectId))?.id
}

export interface CommentThread {
  root: TaskComment
  replies: TaskComment[]
}

/** Top-level comments (oldest first) with their replies. */
export function commentThreads(task: Task): CommentThread[] {
  const byTime = (a: TaskComment, b: TaskComment) => a.createdAt.localeCompare(b.createdAt)
  return task.comments
    .filter((c) => !c.parentId)
    .sort(byTime)
    .map((root) => ({ root, replies: task.comments.filter((c) => c.parentId === root.id).sort(byTime) }))
}

/** "2d ago" style label; falls back to a short date for older items (the cut-offs of `relativeTime`). */
export function agoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return i18n.t('tasks:activity.justNow')
  const label = relativeTime(iso)
  return diff < 7 * 86_400_000 ? i18n.t('tasks:activity.ago', { time: label }) : label
}

export type FeedEntry = { kind: 'activity'; at: string; items: TaskActivity[] } | { kind: 'thread'; at: string; thread: CommentThread }

/** Activity events and comment threads in one chronological list; consecutive events share a timeline block. */
export function buildFeed(task: Task): FeedEntry[] {
  const events = [...task.activity].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const threads = commentThreads(task)
  const mixed: Array<{ at: string; event?: TaskActivity; thread?: CommentThread }> = [
    ...events.map((event) => ({ at: event.createdAt, event })),
    ...threads.map((thread) => ({ at: thread.root.createdAt, thread })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const feed: FeedEntry[] = []
  for (const item of mixed) {
    if (item.thread) {
      feed.push({ kind: 'thread', at: item.at, thread: item.thread })
    } else if (item.event) {
      const last = feed[feed.length - 1]
      if (last && last.kind === 'activity') last.items.push(item.event)
      else feed.push({ kind: 'activity', at: item.at, items: [item.event] })
    }
  }
  return feed
}

/** Activity sentence for one changed field, e.g. "Changed status from Backlog to Done". Deleted statuses, members and labels get a neutral word. */
export function activityChangeText(change: TaskChange, state: Pick<TaskViewState, 'users' | 'statuses' | 'labels'>): string {
  const names = (ids: string[], all: Array<{ id: string; name: string }>, unknown: string) =>
    ids.map((id) => all.find((item) => item.id === id)?.name ?? unknown).join(', ')
  // "assigned Ada and unassigned Bo"
  const both = (added: string, removed: string) => added && removed ? i18n.t('tasks:activity.change.both', { first: added, second: removed }) : added || removed
  switch (change.field) {
    case 'status': {
      const from = state.statuses.find((status) => status.id === change.from)?.name
      const to = state.statuses.find((status) => status.id === change.to)?.name ?? i18n.t('tasks:activity.change.anotherStatus')
      return from ? i18n.t('tasks:activity.change.status', { from, to }) : i18n.t('tasks:activity.change.statusTo', { to })
    }
    case 'priority':
      return change.to === 'none' ? i18n.t('tasks:activity.change.priorityRemoved') : i18n.t('tasks:activity.change.priority', { priority: PRIORITY_LABEL[change.to as TaskPriority] ?? change.to })
    case 'assignees': {
      const someone = i18n.t('tasks:activity.change.someone')
      return both(
        change.added.length > 0 ? i18n.t('tasks:activity.change.assigned', { names: names(change.added, state.users, someone) }) : '',
        change.removed.length > 0 ? i18n.t('tasks:activity.change.unassigned', { names: names(change.removed, state.users, someone) }) : '',
      )
    }
    case 'labels': {
      const deleted = i18n.t('tasks:activity.change.deletedLabel')
      return both(
        change.added.length > 0 ? i18n.t('tasks:activity.change.labelsAdded', { count: change.added.length, names: names(change.added, state.labels, deleted) }) : '',
        change.removed.length > 0 ? i18n.t('tasks:activity.change.labelsRemoved', { count: change.removed.length, names: names(change.removed, state.labels, deleted) }) : '',
      )
    }
    case 'due':
      if (!change.end) return i18n.t('tasks:activity.change.dueRemoved')
      return change.start
        ? i18n.t('tasks:activity.change.dueRange', { start: shortDate(change.start), end: shortDate(change.end) })
        : i18n.t('tasks:activity.change.due', { date: shortDate(change.end) })
    case 'title':
      return i18n.t('tasks:activity.change.title', { from: change.from, to: change.to })
    case 'project':
      return i18n.t('tasks:activity.change.project', { from: change.from, to: change.to })
    case 'description':
      return i18n.t('tasks:activity.change.description')
    case 'source_url':
      return i18n.t('tasks:activity.change.sourceUrl')
  }
}
