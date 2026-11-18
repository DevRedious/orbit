import { useRef, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { Add, Xmark } from 'reicon-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DatabaseSortDirection, DatabaseViewSort, Property, ViewConfig } from '@orbit/database/types'
import { PropertyPicker } from './FilterBar'
import { GripIcon } from './GripIcon'

const MAX_SORTS = 10
/** Labels are `database` catalog keys. */
const DIRECTIONS = [
  { value: 'asc', label: 'sort.ascending' },
  { value: 'desc', label: 'sort.descending' },
] as const

/** The sorts of the view (spec 7.1): property, direction, drag to reorder, remove, "+ Add sort". */
export function SortPopover({ properties, config, onConfig, trigger }: {
  properties: Property[]
  config: ViewConfig
  onConfig: (config: ViewConfig) => void
  trigger: ReactElement
}) {
  const { t } = useTranslation('database')
  const [adding, setAdding] = useState(false)
  const directions = DIRECTIONS.map((item) => ({ value: item.value, label: t(item.label) }))
  const dragFrom = useRef<number | null>(null)
  const sorts = config.sorts
  const setSorts = (next: DatabaseViewSort[]) => onConfig({ ...config, sorts: next })
  const unsorted = properties.filter((property) => !sorts.some((sort) => sort.property_id === property.id))
  const propertyItems = (current: string) =>
    properties
      .filter((property) => property.id === current || unsorted.includes(property))
      .map((property) => ({ value: property.id, label: property.name }))

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-auto min-w-72 gap-1 p-1.5">
        {sorts.length === 0 ? <p className="px-1.5 py-1 text-sm text-muted-foreground">{t('sort.none')}</p> : null}
        <ul aria-label={t('sort.sorts')} className="flex flex-col gap-1">
          {sorts.map((sort, index) => (
            <li
              key={sort.property_id}
              className="flex items-center gap-1.5"
              onDragOver={(event) => {
                if (dragFrom.current !== null) event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                const from = dragFrom.current
                dragFrom.current = null
                if (from === null || from === index) return
                const next = [...sorts]
                const [moved] = next.splice(from, 1)
                next.splice(index, 0, moved)
                setSorts(next)
              }}
            >
              <span
                draggable
                role="button"
                tabIndex={-1}
                aria-label={t('sort.drag')}
                className="flex h-7 w-4 cursor-grab items-center justify-center text-muted-foreground"
                onDragStart={(event) => {
                  dragFrom.current = index
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', sort.property_id)
                }}
                onDragEnd={() => {
                  dragFrom.current = null
                }}
              >
                <GripIcon />
              </span>
              <Select
                items={propertyItems(sort.property_id)}
                value={sort.property_id}
                onValueChange={(value) => value && setSorts(sorts.map((other, at) => (at === index ? { ...other, property_id: value as string } : other)))}
              >
                <SelectTrigger size="sm" aria-label={t('sort.property')} className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyItems(sort.property_id).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                items={directions}
                value={sort.direction}
                onValueChange={(value) => value && setSorts(sorts.map((other, at) => (at === index ? { ...other, direction: value as DatabaseSortDirection } : other)))}
              >
                <SelectTrigger size="sm" aria-label={t('sort.direction')} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {directions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('sort.remove')}
                className="text-muted-foreground"
                onClick={() => setSorts(sorts.filter((_, at) => at !== index))}
              >
                <Xmark />
              </Button>
            </li>
          ))}
        </ul>
        {sorts.length < MAX_SORTS && unsorted.length > 0 ? (
          <PropertyPicker
            properties={unsorted}
            label={t('sort.sortBy')}
            open={adding}
            onOpenChange={setAdding}
            onPick={(property) => setSorts([...sorts, { property_id: property.id, direction: 'asc' }])}
            trigger={
              <Button type="button" variant="ghost" size="sm" className="justify-start text-muted-foreground">
                <Add />
                {t('sort.add')}
              </Button>
            }
          />
        ) : null}
        {sorts.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => setSorts([])}>
            {t('sort.deleteAll')}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
