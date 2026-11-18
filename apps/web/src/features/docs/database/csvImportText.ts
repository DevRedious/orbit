import type { DatabaseImportResult } from '@orbit/api/generated/types.gen'
import { ApiProblem } from '@orbit/api/problem'
import type { CsvTable } from '@orbit/database/csv'
import { i18n } from '@/i18n'

/** The words for a failed import: a 422 names the row or column it is about. */
export function csvImportErrorMessage(error: unknown, table: CsvTable): string {
  if (error instanceof ApiProblem) {
    if (error.code === 'database_row_limit') return i18n.t('database:csv.errorRowLimit')
    if (error.code === 'database_property_limit') return i18n.t('database:csv.errorPropertyLimit')
    if (error.code === 'page_locked') return i18n.t('database:csv.errorLocked')
    if (error.status === 413) return i18n.t('database:csv.errorTooLarge')
    if (error.status === 422) {
      const row = /^rows\[(\d+)\]/.exec(error.detail)
      if (row) return i18n.t('database:csv.errorRowCells', { row: Number(row[1]) + 1 })
      const column = /^columns\[(\d+)\]/.exec(error.detail)
      if (column) return i18n.t('database:csv.errorColumn', { column: table.header[Number(column[1])] ?? '' })
      if (error.detail === 'columns') return i18n.t('database:csv.errorColumns')
      return error.detail
    }
  }
  return i18n.t('database:csv.errorGeneric')
}

/** What an import did, in words ("Imported 12 rows. 3 new options."). */
export function importSummary(result: DatabaseImportResult): string {
  const n = (value: number) => value.toLocaleString(i18n.language)
  const parts: string[] = [i18n.t('database:csv.summaryRows', { count: result.created_rows, n: n(result.created_rows) })]
  if (result.created_options > 0) parts.push(i18n.t('database:csv.summaryOptions', { count: result.created_options, n: n(result.created_options) }))
  if (result.cleared > 0) parts.push(i18n.t('database:csv.summaryCleared', { count: result.cleared, n: n(result.cleared) }))
  if (result.values_truncated > 0) parts.push(i18n.t('database:csv.summaryTruncated', { count: result.values_truncated, n: n(result.values_truncated) }))
  return parts.join(' ')
}
