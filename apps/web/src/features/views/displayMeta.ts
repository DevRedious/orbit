import { Calendar, Kanban, List, type IconComponent } from 'reicon-react'
import { i18n } from '@/i18n'
import type { GroupBy, Layout, TaskProperty } from './viewState'

/** Layouts and their icons, shared by the Display popover and the Views page; `layoutLabel` names them. */
export const LAYOUTS: Array<{ value: Layout; icon: IconComponent }> = [
  { value: 'list', icon: List },
  { value: 'board', icon: Kanban },
  { value: 'timeline', icon: Calendar },
]

export function layoutLabel(layout: Layout): string {
  return i18n.t(`views:display.layouts.${layout}`)
}

export function groupLabel(group: GroupBy): string {
  return i18n.t(`views:display.groups.${group}`)
}

/** The properties a timeline row has room for; the others keep their value for list and board. */
export const TIMELINE_PROPERTIES: readonly TaskProperty[] = ['id', 'status', 'assignee', 'priority']
