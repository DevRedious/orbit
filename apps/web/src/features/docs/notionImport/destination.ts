import type { NotionImport, PageSummary, Teamspace } from '@orbit/api/generated/types.gen'
import { pageTitle } from '@/features/docs/pageTree'
import { i18n } from '@/i18n'

/** Where an import's pages went, for the summary ("General", "Private", or "Inside “Roadmap”"). */
export function destinationLabel(
  destination: NotionImport['destination'],
  teamspaces: readonly Teamspace[] | undefined,
  pages: readonly PageSummary[] | undefined,
): string | null {
  if (!destination) return null
  if (destination.parent_page_id) {
    const page = pages?.find((item) => item.id === destination.parent_page_id)
    return page ? i18n.t('docs:notionImport.destinationInside', { title: pageTitle(page) }) : i18n.t('docs:notionImport.destinationInsidePage')
  }
  if (destination.private) return i18n.t('docs:space.private')
  return teamspaces?.find((teamspace) => teamspace.id === destination.teamspace_id)?.name ?? i18n.t('docs:space.teamspace')
}
