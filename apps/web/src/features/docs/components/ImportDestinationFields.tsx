import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TOP_LEVEL, type useImportDestination } from '@/features/docs/import/destination'
import { PRIVATE_SPACE, pageTitle, teamspaceSpace, type SpaceKey } from '@/features/docs/pageTree'

/** The "Import into" and "Inside page" selects of a Docs import. */
export function ImportDestinationFields({ destination }: { destination: ReturnType<typeof useImportDestination> }) {
  const { t } = useTranslation('docs')
  const spaceId = useId()
  const parentId = useId()
  const spaceItems = [
    ...(destination.teamspaces ?? []).map((teamspace) => ({ value: teamspaceSpace(teamspace.id) as string, label: teamspace.name })),
    { value: PRIVATE_SPACE as string, label: t('space.private') },
  ]
  const parentItems = [
    { value: TOP_LEVEL, label: t('notionImport.topLevel') },
    ...destination.parentOptions.map(({ page }) => ({ value: page.id, label: pageTitle(page) })),
  ]
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={spaceId} className="text-xs text-muted-foreground">
          {t('notionImport.importInto')}
        </Label>
        <Select
          items={spaceItems}
          value={destination.space}
          onValueChange={(value) => {
            if (value) destination.chooseSpace(value as SpaceKey)
          }}
        >
          <SelectTrigger id={spaceId} className="w-48" aria-label={t('notionImport.importInto')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spaceItems.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={parentId} className="text-xs text-muted-foreground">
          {t('notionImport.insidePage')}
        </Label>
        <Select items={parentItems} value={destination.parent} onValueChange={destination.chooseParent}>
          <SelectTrigger id={parentId} className="w-56" aria-label={t('notionImport.insidePage')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOP_LEVEL}>{t('notionImport.topLevel')}</SelectItem>
            {destination.parentOptions.map(({ page, depth }) => (
              <SelectItem key={page.id} value={page.id} style={{ paddingLeft: 8 + depth * 12 }}>
                {pageTitle(page)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
