import type { TaskRelationRecord } from '@orbit/api/generated/types.gen'
import type { Task, TaskStatusDef } from '@/features/tasks/api/models'
import { i18n } from '@/i18n'

/** What the picker chooses a task for. `blocked_by` is stored server-side as "the other task blocks this one". */
export type RelationKind = 'duplicate' | 'blocks' | 'blocked_by' | 'related'
export type RelationGroupKey = 'duplicate_of' | 'blocked_by' | 'blocks' | 'related' | 'duplicated_by'

const GROUP_ORDER: RelationGroupKey[] = ['duplicate_of', 'blocked_by', 'blocks', 'related', 'duplicated_by']

export interface RelationGroup {
  key: RelationGroupKey
  label: string
  relations: TaskRelationRecord[]
}

/** Section of a relation seen from the viewed task; null for types this client does not know. */
export function relationGroupOf({ type, direction }: Pick<TaskRelationRecord, 'type' | 'direction'>): RelationGroupKey | null {
  if (type === 'duplicate') return direction === 'outgoing' ? 'duplicate_of' : 'duplicated_by'
  if (type === 'blocks') return direction === 'outgoing' ? 'blocks' : 'blocked_by'
  if (type === 'related') return 'related'
  return null
}

/** Non-empty groups in the fixed order, oldest relation first inside a group. */
export function groupRelations(relations: TaskRelationRecord[]): RelationGroup[] {
  return GROUP_ORDER.flatMap((key) => {
    const own = relations
      .filter((relation) => relationGroupOf(relation) === key)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    return own.length > 0 ? [{ key, label: i18n.t(`tasks:relations.group.${key}`), relations: own }] : []
  })
}

/** Other-side task ids of every known relation (excluded from the blocks/related picker). */
export function relatedTaskIds(relations: TaskRelationRecord[]): string[] {
  return relations.filter((relation) => relationGroupOf(relation) !== null).map((relation) => relation.task.id)
}

/** `subject` is an identifier, or a count for the bulk duplicate picker. */
export function pickerTitle(kind: RelationKind, subject: string | number): string {
  switch (kind) {
    case 'duplicate':
      return typeof subject === 'number'
        ? i18n.t('tasks:relations.pickerTitle.duplicateMany', { count: subject })
        : i18n.t('tasks:relations.pickerTitle.duplicate', { subject })
    case 'blocks':
      return i18n.t('tasks:relations.pickerTitle.blocks', { subject })
    case 'blocked_by':
      return i18n.t('tasks:relations.pickerTitle.blocked_by', { subject })
    case 'related':
      return i18n.t('tasks:relations.pickerTitle.related', { subject })
  }
}

/** The "Add relation" menu, in order. `label` reads the catalog each time, so it follows the language. */
export const ADD_RELATION_OPTIONS: ReadonlyArray<{ kind: RelationKind; readonly label: string }> = (['blocks', 'blocked_by', 'related', 'duplicate'] as const)
  .map((kind) => ({ kind, get label() { return i18n.t(`tasks:relations.add.${kind}`) } }))

/** Deduped picker rows: identifier, title or description contain the query; excluded ids and (optionally) duplicates dropped. */
export function pickerCandidates({ tasks, query, excludeIds, excludeDuplicates, statuses = [], limit = 20 }: {
  tasks: Task[]
  query: string
  excludeIds: readonly string[]
  excludeDuplicates: boolean
  /** A task in a Duplicate status still holds its relation even when `duplicateOf` is hidden (trashed target). */
  statuses?: readonly TaskStatusDef[]
  limit?: number
}): Task[] {
  const needle = query.trim().toLowerCase()
  const skip = new Set(excludeIds)
  const duplicateStatusIds = new Set(statuses.filter((status) => status.category === 'duplicate').map((status) => status.id))
  const seen = new Set<string>()
  const result: Task[] = []
  for (const task of tasks) {
    if (seen.has(task.id) || skip.has(task.id)) continue
    seen.add(task.id)
    if (excludeDuplicates && (task.duplicateOf || duplicateStatusIds.has(task.statusId))) continue
    if (needle && !`${task.identifier} ${task.title} ${task.description}`.toLowerCase().includes(needle)) continue
    result.push(task)
    if (result.length === limit) break
  }
  return result
}

export function duplicateToastMessage(count: number, targetIdentifier: string): string {
  return count === 1
    ? i18n.t('tasks:duplicate.marked', { target: targetIdentifier })
    : i18n.t('tasks:duplicate.markedMany', { count, target: targetIdentifier })
}

export function duplicateErrorMessage(verb: 'mark' | 'unmark', error: unknown): string {
  const message = i18n.t(verb === 'mark' ? 'tasks:duplicate.markFailed' : 'tasks:duplicate.unmarkFailed')
  return error instanceof Error && error.message ? `${message} ${error.message}` : message
}
