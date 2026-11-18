// UI-language names of the database package's enums (property types, operators, calculations…). The package keeps
// English label maps for its own text; the app shows these instead.
import type { DatabaseCalculation, DatabaseFilterOperator, DatabasePropertyType, OptionColor } from '@orbit/database/types'
import type { RollupFunction } from '@orbit/database/relations'
import type { TimelineZoom } from '@orbit/database/timeline'
import { i18n } from '@/i18n'

/** Symbol operators read the same in every language. */
const SYMBOL_OPERATORS: Partial<Record<DatabaseFilterOperator, string>> = { '=': '=', '!=': '≠', '>': '>', '<': '<', '>=': '≥', '<=': '≤' }

export function propertyTypeLabel(type: DatabasePropertyType): string {
  return i18n.t(`database:propertyType.${type}`)
}

export function operatorLabel(operator: DatabaseFilterOperator): string {
  const symbol = SYMBOL_OPERATORS[operator]
  if (symbol !== undefined) return symbol
  return i18n.t(`database:operator.${operator as Exclude<DatabaseFilterOperator, '=' | '!=' | '>' | '<' | '>=' | '<='>}`)
}

/** A relative date value (`today`, `one_week_ago`…), or `undefined` for anything else. */
export function relativeDateLabel(value: string): string | undefined {
  return i18n.exists(`database:relativeDate.${value}`) ? i18n.t(`database:relativeDate.${value}` as 'database:relativeDate.today') : undefined
}

export function optionColorLabel(color: OptionColor): string {
  return i18n.t(`database:optionColor.${color}`)
}

/** The menu name of a calculation. */
export function calculationName(calculation: DatabaseCalculation): string {
  return i18n.t(`database:calculation.${calculation}`)
}

/** The footer label of a calculation. */
export function calculationShort(calculation: DatabaseCalculation): string {
  return i18n.t(`database:calculationShort.${calculation}`)
}

export function rollupFunctionLabel(fn: RollupFunction): string {
  return i18n.t(`database:rollupFunction.${fn}`)
}

export function timelineZoomLabel(zoom: TimelineZoom): string {
  return i18n.t(`database:timelineZoom.${zoom}`)
}
