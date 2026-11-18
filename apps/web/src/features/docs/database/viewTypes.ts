import { Calendar, Chart, ClipboardText, Gallery, Grid, Kanban, List, RowHorizontal } from 'reicon-react'
import type { DatabaseView } from '@orbit/database/types'

type ViewType = DatabaseView['type']

/** The "Add a new view" grid, in Notion's order (`label` is a `database` catalog key). Entries without a `type` are not built yet. */
export const VIEW_KINDS = [
  { label: 'viewTypes.table', icon: Grid, type: 'table' },
  { label: 'viewTypes.board', icon: Kanban, type: 'board' },
  { label: 'viewTypes.list', icon: List, type: 'list' },
  { label: 'viewTypes.gallery', icon: Gallery, type: 'gallery' },
  { label: 'viewTypes.calendar', icon: Calendar, type: 'calendar' },
  { label: 'viewTypes.timeline', icon: RowHorizontal, type: 'timeline' },
  { label: 'viewTypes.chart', icon: Chart, type: null },
  { label: 'viewTypes.form', icon: ClipboardText, type: 'form' },
] as const satisfies readonly { label: string; icon: typeof Grid; type: ViewType | null }[]

export function viewIcon(type: ViewType): typeof Grid {
  return VIEW_KINDS.find((kind) => kind.type === type)?.icon ?? Grid
}

/** `base`, or `base 2`, `base 3`, … when a view already has the name. */
export function uniqueViewName(base: string, views: readonly DatabaseView[]): string {
  const names = new Set(views.map((view) => view.name))
  if (!names.has(base)) return base
  let n = 2
  while (names.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}
