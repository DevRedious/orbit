import { parseISO } from 'date-fns'
import {
  Calendar,
  CalendarTick,
  Category,
  Clock,
  Flag,
  Folder,
  Hierarchy2,
  RecordCircle,
  Tag,
  TaskSquare,
  Text as TextIcon,
  User as UserIcon,
  UserEdit,
  type IconComponent,
} from 'reicon-react'
import type { LabelRecord, ProjectRecord } from '@orbit/api/generated/types.gen'
import type { TaskPriority, TaskStatusDef } from '@/features/tasks/api/models'
import { CATEGORY_LABEL, CATEGORY_ORDER, labelKeyOf, labelRepresentatives, PRIORITY_LABEL, projectLabels, PRIORITY_ORDER, sortStatuses, statusKeyOf } from '@/features/tasks/taskMeta'
import type { User } from '@/features/workspaces/models'
import { i18n } from '@/i18n'
import type { Condition, DateValue, FilterField, FilterOperator, TaskPreset } from './viewState'

export type TaskFilterRef = { identifier: string; title: string }

/** Everything the pickers can offer, loaded once by the page. */
export type FilterOptions = {
  statuses: TaskStatusDef[]
  members: User[]
  /** Every label; ids in saved filters resolve against all of them. */
  labels: LabelRecord[]
  /** A project page lists only this project's labels. */
  projectId?: string | null
  projects: ProjectRecord[]
  currentUserId: string
  /** Parent filter values → task (null: deleted or trashed). Filled by `useFilterTaskRefs`. */
  taskRefs?: Readonly<Record<string, TaskFilterRef | null>>
}

export type FieldKind = 'list' | 'date' | 'text' | 'task'

/** The Parent filter's "no parent" value. */
export const NO_PARENT = 'none'

export type FieldMeta = {
  icon: IconComponent
  kind: FieldKind
  operators: FilterOperator[]
  defaultOperator: FilterOperator
}

export const FIELD_META: Record<FilterField, FieldMeta> = {
  status: { icon: RecordCircle, kind: 'list', operators: ['is', 'is_not'], defaultOperator: 'is' },
  status_category: { icon: Category, kind: 'list', operators: ['is', 'is_not'], defaultOperator: 'is' },
  assignee: { icon: UserIcon, kind: 'list', operators: ['is', 'is_not', 'is_empty', 'is_not_empty'], defaultOperator: 'is' },
  creator: { icon: UserEdit, kind: 'list', operators: ['is', 'is_not'], defaultOperator: 'is' },
  label: { icon: Tag, kind: 'list', operators: ['includes_any', 'includes_all', 'excludes', 'is_empty', 'is_not_empty'], defaultOperator: 'includes_any' },
  priority: { icon: Flag, kind: 'list', operators: ['is', 'is_not'], defaultOperator: 'is' },
  project: { icon: Folder, kind: 'list', operators: ['is', 'is_not'], defaultOperator: 'is' },
  parent: { icon: Hierarchy2, kind: 'task', operators: ['is', 'is_not'], defaultOperator: 'is' },
  sub_issues: { icon: Hierarchy2, kind: 'list', operators: ['is'], defaultOperator: 'is' },
  due_date: { icon: Calendar, kind: 'date', operators: ['before', 'after', 'between', 'is_empty', 'is_not_empty'], defaultOperator: 'before' },
  created_at: { icon: CalendarTick, kind: 'date', operators: ['before', 'after'], defaultOperator: 'after' },
  updated_at: { icon: Clock, kind: 'date', operators: ['before', 'after'], defaultOperator: 'after' },
  text: { icon: TextIcon, kind: 'text', operators: ['contains'], defaultOperator: 'contains' },
}

export const FIELD_ORDER: FilterField[] = ['status', 'status_category', 'assignee', 'creator', 'label', 'priority', 'project', 'parent', 'sub_issues', 'due_date', 'created_at', 'updated_at', 'text']

/** User conditions per tree: the server allows 50 on the effective tree, and a scope adds up to 3 preset conditions + 1 project condition. */
export const MAX_FILTER_CONDITIONS = 46

/** Values per condition, as the server allows. */
export const MAX_FILTER_VALUES = 100

/** The field's name, as a filter chip or a field picker shows it. */
export function fieldLabel(field: FilterField): string {
  return i18n.t(`views:filter.fields.${field}`)
}

/** The field's values inside a sentence ("Search labels"). */
export function fieldPlural(field: FilterField): string {
  return i18n.t(`views:filter.pluralNames.${field}`)
}

/** Chip text for the non-removable preset scope. */
export function presetLabel(preset: TaskPreset): string {
  return i18n.t(`views:filter.presets.${preset}`)
}

/** Kept for callers that index by preset: each read translates at that moment, never at import. */
export const PRESET_LABEL: Readonly<Record<TaskPreset, string>> = {
  get mine() { return presetLabel('mine') },
  get overdue() { return presetLabel('overdue') },
  get due_soon() { return presetLabel('due_soon') },
  get current_week() { return presetLabel('current_week') },
  get my_week() { return presetLabel('my_week') },
}

export type Glyph =
  | { kind: 'status'; status: Pick<TaskStatusDef, 'category' | 'color'> }
  | { kind: 'dot'; color: string }
  | { kind: 'member'; member: User | undefined; name: string }
  | { kind: 'priority'; priority: TaskPriority }
  | { kind: 'icon'; icon: IconComponent }

export type ValueOption = { value: string; label: string; glyph: Glyph }

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name)

/** One option per status key; same-named statuses of different projects share it. */
export function statusOptions(statuses: TaskStatusDef[]): ValueOption[] {
  const seen = new Set<string>()
  const options: ValueOption[] = []
  for (const status of sortStatuses(statuses)) {
    const key = statusKeyOf(status)
    if (seen.has(key)) continue
    seen.add(key)
    options.push({ value: key, label: status.name, glyph: { kind: 'status', status } })
  }
  return options
}

export function valueOptions(field: FilterField, options: FilterOptions): ValueOption[] {
  switch (field) {
    case 'status':
      return statusOptions(options.statuses)
    case 'status_category':
      return CATEGORY_ORDER.map((category): ValueOption => ({
        value: category,
        label: CATEGORY_LABEL[category],
        glyph: { kind: 'status', status: { category, color: 'var(--muted-foreground)' } },
      }))
    case 'assignee':
    case 'creator': {
      const me = options.members.find((person) => person.id === options.currentUserId)
      const meLabel = i18n.t('views:filter.me')
      return [
        { value: 'me', label: meLabel, glyph: { kind: 'member', member: me, name: me?.name ?? meLabel } },
        ...options.members
          .filter((person) => person.id !== options.currentUserId)
          .map((person): ValueOption => ({ value: person.id, label: person.name, glyph: { kind: 'member', member: person, name: person.name } })),
      ]
    }
    case 'label':
      // a label value is its key (the name): the server matches it in every project
      return labelRepresentatives(options.projectId ? projectLabels(options.labels, options.projectId) : options.labels).labels.map((item): ValueOption => ({ value: labelKeyOf(item), label: item.name, glyph: { kind: 'dot', color: item.color } }))
    case 'priority':
      return PRIORITY_ORDER.map((priority): ValueOption => ({ value: priority, label: PRIORITY_LABEL[priority], glyph: { kind: 'priority', priority } }))
    case 'project':
      return [...options.projects].sort(byName).map((project): ValueOption => ({ value: project.id, label: project.name, glyph: { kind: 'dot', color: project.color } }))
    case 'sub_issues':
      return [
        { value: 'has', label: i18n.t('views:filter.subIssues.has'), glyph: { kind: 'icon', icon: Hierarchy2 } },
        { value: 'none', label: i18n.t('views:filter.subIssues.none'), glyph: { kind: 'icon', icon: TaskSquare } },
      ]
    default:
      return []
  }
}

export function listValue(condition: Condition): string[] {
  return Array.isArray(condition.value) ? condition.value.filter((value): value is string => typeof value === 'string') : []
}

/**
 * The list values as the pickers show them. A label id (views saved before labels were per project) reads as its
 * label's key, so it shows the label and editing the condition saves the key instead.
 */
export function chosenValues(condition: Condition, options: FilterOptions): string[] {
  const values = listValue(condition)
  if (condition.field !== 'label') return values
  const keys = new Map(options.labels.map((label) => [label.id, labelKeyOf(label)]))
  return [...new Set(values.map((value) => keys.get(value) ?? value))]
}

/** A member picked by ID rather than from the list, e.g. your own ID written by the legacy migration instead of `me`. */
function memberByIdOption(value: string, options: FilterOptions): ValueOption | undefined {
  const person = options.members.find((candidate) => candidate.id === value)
  return person ? { value, label: person.name, glyph: { kind: 'member', member: person, name: person.name } } : undefined
}

/** The chosen list values as options, in the order the user picked them. Unknown IDs are dropped. */
export function selectedOptions(condition: Condition, options: FilterOptions): ValueOption[] {
  if (FIELD_META[condition.field].kind !== 'list') return []
  const known = new Map(valueOptions(condition.field, options).map((option) => [option.value, option]))
  return chosenValues(condition, options).flatMap((value): ValueOption[] => {
    const option = known.get(value) ?? memberByIdOption(value, options)
    return option ? [option] : []
  })
}

/**
 * Chosen values the picker would not list: a member chosen by ID, or an ID that no longer exists ("Unknown label").
 * The picker shows them as extra rows, so they can still be seen and cleared.
 */
export function unlistedOptions(condition: Condition, options: FilterOptions): ValueOption[] {
  if (FIELD_META[condition.field].kind !== 'list') return []
  const listed = new Set(valueOptions(condition.field, options).map((option) => option.value))
  return chosenValues(condition, options)
    .filter((value) => !listed.has(value))
    .map((value) => memberByIdOption(value, options) ?? { value, label: i18n.t(`views:filter.unknown.${condition.field}`), glyph: { kind: 'dot', color: 'var(--muted-foreground)' } })
}

export function isDateValue(value: unknown): value is DateValue {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.absolute === 'string' || candidate.relative === 'today' || candidate.relative === 'start_of_week' || candidate.relative === 'end_of_week'
}

const RELATIVE_KEY = { today: 'today', start_of_week: 'startOfWeek', end_of_week: 'endOfWeek' } as const

export function dateValueLabel(value: DateValue): string {
  if ('absolute' in value) return parseISO(value.absolute).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })
  const offset = value.offset_days ?? 0
  if (value.relative === 'today') {
    if (offset === 0) return i18n.t('views:filter.dates.today')
    if (offset === 1) return i18n.t('views:filter.dates.tomorrow')
    if (offset === -1) return i18n.t('views:filter.dates.yesterday')
    return offset > 0 ? i18n.t('views:filter.dates.inDays', { count: offset }) : i18n.t('views:filter.dates.daysAgo', { count: -offset })
  }
  const base = i18n.t(`views:filter.dates.${RELATIVE_KEY[value.relative]}`)
  return offset === 0 ? base : i18n.t('views:filter.dates.offset', { base, sign: offset > 0 ? '+' : '-', days: Math.abs(offset) })
}

export function operatorNeedsValue(operator: FilterOperator): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty'
}

export function operatorLabel(operator: FilterOperator, count: number): string {
  return i18n.t(`views:filter.operators.${operatorKey(operator, count)}`)
}

function operatorKey(operator: FilterOperator, count: number) {
  switch (operator) {
    case 'is':
      return count > 1 ? 'isAnyOf' : 'is'
    case 'is_not':
      return count > 1 ? 'isNoneOf' : 'isNot'
    case 'is_empty':
      return 'isEmpty'
    case 'is_not_empty':
      return 'isNotEmpty'
    case 'includes_any':
      return count > 1 ? 'includesAnyOf' : 'includes'
    case 'includes_all':
      return 'includesAllOf'
    case 'excludes':
    case 'before':
    case 'after':
    case 'between':
    case 'contains':
      return operator
  }
}

/** Chip and picker text for one Parent value. A task not loaded yet reads as its short id. */
export function taskValueLabel(value: string, options: FilterOptions): string {
  if (value === NO_PARENT) return i18n.t('views:filter.noParent')
  const ref = options.taskRefs?.[value]
  if (ref === null) return i18n.t('views:filter.deletedTask')
  return ref ? `${ref.identifier} ${ref.title || i18n.t('views:filter.untitled')}` : `TASK-${value.slice(-4).toUpperCase()}`
}

/** Chip value text: up to two names, then a count ("3 labels"). Empty for is_empty / is_not_empty. */
export function valueSummary(condition: Condition, options: FilterOptions): string {
  if (!operatorNeedsValue(condition.operator)) return ''
  const meta = FIELD_META[condition.field]
  if (meta.kind === 'text') return typeof condition.value === 'string' && condition.value ? i18n.t('views:filter.quoted', { text: condition.value }) : ''
  if (meta.kind === 'date') {
    if (condition.operator === 'between') {
      const range = Array.isArray(condition.value) ? condition.value : []
      return range.length === 2 && isDateValue(range[0]) && isDateValue(range[1]) ? i18n.t('views:filter.dates.range', { start: dateValueLabel(range[0]), end: dateValueLabel(range[1]) }) : ''
    }
    return isDateValue(condition.value) ? dateValueLabel(condition.value) : ''
  }
  if (meta.kind === 'task') {
    const values = listValue(condition)
    return values.length > 2 ? i18n.t('views:filter.valueCount.parent', { count: values.length }) : values.map((value) => taskValueLabel(value, options)).join(', ')
  }
  const values = chosenValues(condition, options)
  if (values.length > 2) return i18n.t(`views:filter.valueCount.${condition.field}`, { count: values.length })
  const known = new Map(selectedOptions(condition, options).map((option) => [option.value, option.label]))
  return values.map((value) => known.get(value) ?? i18n.t(`views:filter.unknown.${condition.field}`)).join(', ')
}

export function defaultValue(field: FilterField, operator: FilterOperator): unknown {
  if (!operatorNeedsValue(operator)) return undefined
  const kind = FIELD_META[field].kind
  if (kind === 'text') return ''
  if (kind === 'date') return operator === 'between' ? [{ relative: 'start_of_week' }, { relative: 'end_of_week' }] : { relative: 'today' }
  return []
}

/** Changes the operator, converting the value where it can (date ↔ range) and clearing it where it must. */
export function withOperator(condition: Condition, operator: FilterOperator): Condition {
  const { field } = condition
  if (!operatorNeedsValue(operator)) return { field, operator }
  if (!operatorNeedsValue(condition.operator)) return { field, operator, value: defaultValue(field, operator) }
  if (FIELD_META[field].kind === 'date') {
    const wasRange = condition.operator === 'between'
    if (operator === 'between' && !wasRange) {
      return { field, operator, value: isDateValue(condition.value) ? [condition.value, condition.value] : defaultValue(field, operator) }
    }
    if (operator !== 'between' && wasRange) {
      const first = Array.isArray(condition.value) ? condition.value[0] : undefined
      return { field, operator, value: isDateValue(first) ? first : defaultValue(field, operator) }
    }
  }
  return { ...condition, operator }
}

/** True when the server can evaluate it: list values present, text not blank, dates well-formed. */
export function isCompleteCondition(condition: Condition): boolean {
  if (!operatorNeedsValue(condition.operator)) return true
  const kind = FIELD_META[condition.field].kind
  if (kind === 'text') return typeof condition.value === 'string' && condition.value.trim().length > 0
  if (kind === 'date') {
    if (condition.operator !== 'between') return isDateValue(condition.value)
    return Array.isArray(condition.value) && condition.value.length === 2 && condition.value.every(isDateValue)
  }
  return listValue(condition).length > 0
}
