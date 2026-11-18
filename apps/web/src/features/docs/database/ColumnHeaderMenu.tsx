import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Add, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, EyeSlash, Filter, Settings, Trash } from 'reicon-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tip } from '@/components/common/Tip'
import { confirmAction } from '@/components/common/confirmAction'
import { isPaymentRequired } from '@orbit/api/problem'
import type { DatabasePropertyType, Property, ViewConfig } from '@orbit/database/types'
import { databaseErrorMessage } from '@orbit/database/errors'
import { previewPropertyUpdate, useCreateProperty, useDatabase, useDeleteProperty, useUpdateProperty } from './api'
import { useDatabaseEnv } from './context'
import { placeColumn } from './databaseLib'
import { filterable, isComputed, sortable } from '@orbit/database/meta'
import { CREATABLE_TYPES, NEW_ONLY_TYPES, PROPERTY_TYPES } from './propertyMeta'
import { RelationMenu, RelationSetup, RollupMenu, RollupSetup } from './RelationConfig'
import { ButtonConfigDialog } from './ButtonConfigDialog'
import { FormulaDialog } from './FormulaDialog'
import { UniqueIdPrefix } from './UniqueIdPrefix'
import { PropertyOptions } from './PropertyOptions'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'HUF']

interface ColumnHeaderMenuProps {
  property: Property
  config: ViewConfig
  onConfig: (config: ViewConfig) => void
  onFilter: (propertyId: string) => void
}

/** The header cell menu (spec 7.2): name, type and format, sort, filter, hide, insert, duplicate, delete. */
export function ColumnHeaderMenu({ property, config, onConfig, onFilter }: ColumnHeaderMenuProps) {
  const { t } = useTranslation('database')
  const { workspaceId, databaseId, canEditSchema } = useDatabaseEnv()
  const updateProperty = useUpdateProperty(workspaceId, databaseId)
  const createProperty = useCreateProperty(workspaceId, databaseId)
  const deleteProperty = useDeleteProperty(workspaceId, databaseId)
  const [name, setName] = useState(property.name)
  const [open, setOpen] = useState(false)
  /** "Insert left/right" asks for a name and a type in a popover at the header. */
  const [inserting, setInserting] = useState<'left' | 'right' | null>(null)
  const insertingRef = useRef(false)
  const [header, setHeader] = useState<HTMLButtonElement | null>(null)
  const isTitle = property.type === 'title'
  const [configuringButton, setConfiguringButton] = useState(false)
  const [editingFormula, setEditingFormula] = useState(false)
  /** A property inserted from this header; a formula or a button opens its editor. */
  const [created, setCreated] = useState<string | null>(null)

  const rename = () => {
    const next = name.trim()
    if (!canEditSchema || !next || next === property.name) return
    updateProperty.mutate({ propertyId: property.id, body: { name: next.slice(0, 200) } })
  }
  // The server converts the values: a dry run first tells whether any would be lost.
  const changeType = async (type: DatabasePropertyType) => {
    if (type === property.type) return
    let cleared: number
    try {
      cleared = (await previewPropertyUpdate(workspaceId, databaseId, property.id, { type })).cleared
    } catch (error) {
      if (!isPaymentRequired(error)) toast.error(databaseErrorMessage(error, t('property.changeFailed')))
      return
    }
    if (
      cleared > 0 &&
      !(await confirmAction({
        title: t('property.changeTypeTitle', { name: property.name, type: PROPERTY_TYPES[type].label }),
        description: t('property.changeTypeDescription', { count: cleared }),
        confirmLabel: t('property.changeType'),
        danger: true,
      }))
    ) {
      return
    }
    // A new formula opens its editor (it shows once the refetch has the formula).
    updateProperty.mutate({ propertyId: property.id, body: { type } }, { onSuccess: () => setEditingFormula(type === 'formula') })
  }
  const setConfig = (change: Record<string, unknown>) =>
    updateProperty.mutate({ propertyId: property.id, body: { config: { ...property.config, ...change } } })
  const sortBy = (direction: 'asc' | 'desc') => onConfig({ ...config, sorts: [{ property_id: property.id, direction }] })
  const startInsert = (side: 'left' | 'right') => {
    insertingRef.current = true
    setInserting(side)
  }
  const insert = (side: 'left' | 'right', name: string, type: DatabasePropertyType, propertyConfig?: NewPropertyConfig) => {
    setInserting(null)
    // The server adds the column to the end of every view; this view gets it next to the clicked column.
    createProperty.mutate(
      { name, type, ...(propertyConfig ? { config: propertyConfig } : {}) },
      {
        onSuccess: (created) => {
          onConfig(placeColumn(config, created.id, property.id, side))
          setCreated(created.id)
        },
      },
    )
  }
  const remove = async () => {
    if (
      await confirmAction({
        title: t('property.deleteTitle', { name: property.name }),
        description: t('property.deleteDescription'),
        confirmLabel: t('property.delete'),
        danger: true,
      })
    ) {
      deleteProperty.mutate(property.id)
    }
  }

  const TypeIcon = PROPERTY_TYPES[property.type].icon
  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) {
            setName(property.name)
            insertingRef.current = false
          } else rename()
        }}
        modal={false}
      >
        <DropdownMenuTrigger
          render={
            <button
              ref={setHeader}
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-sm font-normal text-muted-foreground outline-none hover:bg-muted/60 focus-visible:bg-muted/60 aria-expanded:bg-muted/60"
            />
          }
        >
          <TypeIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{property.name}</span>
        </DropdownMenuTrigger>
        {/* The insert popover takes the focus, not the header. */}
        <DropdownMenuContent align="start" className="w-60" finalFocus={() => !insertingRef.current}>
          <div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
            <Input
              aria-label={t('property.name')}
              value={name}
              readOnly={!canEditSchema}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  rename()
                  setOpen(false)
                }
              }}
            />
          </div>
          {canEditSchema && !isTitle ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings />
                {t('property.edit')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {property.type === 'select' || property.type === 'multi_select' || property.type === 'status' ? (
                  <>
                    <PropertyOptions
                      property={property}
                      onOptions={(options) =>
                        updateProperty.mutateAsync({ propertyId: property.id, body: { config: { ...property.config, options } } }).then(() => undefined)
                      }
                    />
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t('property.type')}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={property.type} onValueChange={(type) => void changeType(type as DatabasePropertyType)}>
                    {CREATABLE_TYPES.map((type) => {
                      const Icon = PROPERTY_TYPES[type].icon
                      return (
                        <DropdownMenuRadioItem key={type} value={type}>
                          <Icon className="text-muted-foreground" />
                          {PROPERTY_TYPES[type].label}
                        </DropdownMenuRadioItem>
                      )
                    })}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                {property.type === 'number' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t('property.format')}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={property.config.format === 'currency' ? `currency:${property.config.currency ?? 'USD'}` : property.config.format}
                        onValueChange={(value: string) =>
                          value.startsWith('currency:') ? setConfig({ format: 'currency', currency: value.slice(9) }) : setConfig({ format: value })
                        }
                      >
                        <DropdownMenuRadioItem value="number">{t('property.formatNumber')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="number_with_commas">{t('property.formatNumberWithCommas')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="percent">{t('property.formatPercent')}</DropdownMenuRadioItem>
                        {CURRENCIES.map((currency) => (
                          <DropdownMenuRadioItem key={currency} value={`currency:${currency}`}>
                            {currency}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </>
                ) : null}
                {property.type === 'date' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t('property.dateFormat')}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={property.config.date_format} onValueChange={(value: string) => setConfig({ date_format: value })}>
                        <DropdownMenuRadioItem value="relative">{t('property.dateRelative')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="short">{t('property.dateShort')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="iso">{t('property.dateIso')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{t('property.timeFormat')}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={property.config.time_format} onValueChange={(value: string) => setConfig({ time_format: value })}>
                        <DropdownMenuRadioItem value="12h">{t('property.time12h')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="24h">{t('property.time24h')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </>
                ) : null}
                {property.type === 'button' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setConfiguringButton(true)}>{t('property.editButton')}</DropdownMenuItem>
                  </>
                ) : null}
                {property.type === 'formula' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setEditingFormula(true)}>{t('property.editFormula')}</DropdownMenuItem>
                  </>
                ) : null}
                {property.type === 'unique_id' ? (
                  <>
                    <DropdownMenuSeparator />
                    <UniqueIdPrefix prefix={property.config.prefix} onSave={(prefix) => setConfig({ prefix })} />
                  </>
                ) : null}
                {property.type === 'relation' ? <RelationMenu property={property} /> : null}
                {property.type === 'rollup' ? <RollupMenu property={property} /> : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
          <DropdownMenuSeparator />
          {!filterable(property.type) ? null : (
            <>
              {sortable(property.type) ? (
                <>
                  <DropdownMenuItem onClick={() => sortBy('asc')}>
                    <ArrowUp />
                    {t('property.sortAscending')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sortBy('desc')}>
                    <ArrowDown />
                    {t('property.sortDescending')}
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem onClick={() => onFilter(property.id)}>
                <Filter />
                {t('property.filter')}
              </DropdownMenuItem>
            </>
          )}
          {isTitle ? null : (
            <DropdownMenuItem
              onClick={() =>
                onConfig({ ...config, columns: config.columns.map((column) => (column.property_id === property.id ? { ...column, hidden: true } : column)) })
              }
            >
              <EyeSlash />
              {t('property.hide')}
            </DropdownMenuItem>
          )}
          {canEditSchema ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => startInsert('left')}>
                <ArrowLeft />
                {t('property.insertLeft')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => startInsert('right')}>
                <ArrowRight />
                {t('property.insertRight')}
              </DropdownMenuItem>
              {isTitle ? null : (
                <>
                  {property.type === 'unique_id' ? null : (
                    <DropdownMenuItem onClick={() => createProperty.mutate({ duplicate_of: property.id })}>
                      <Copy />
                      {t('property.duplicate')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => void remove()}>
                    <Trash />
                    {t('property.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover
        open={inserting !== null}
        onOpenChange={(next) => {
          if (!next) setInserting(null)
        }}
      >
        {inserting ? (
          <PopoverContent anchor={header} align="start" className="w-60 gap-0 p-0">
            <NewPropertyForm relations onCreate={(name, type, propertyConfig) => insert(inserting, name, type, propertyConfig)} />
          </PopoverContent>
        ) : null}
      </Popover>
      {configuringButton && property.type === 'button' ? <ButtonConfigDialog property={property} onClose={() => setConfiguringButton(false)} /> : null}
      {editingFormula && property.type === 'formula' ? <FormulaDialog property={property} onClose={() => setEditingFormula(false)} /> : null}
      {created ? <NewPropertySetup propertyId={created} onClose={() => setCreated(null)} /> : null}
    </>
  )
}

/** A new formula or button opens its editor at once: without an expression or actions it does nothing. */
function NewPropertySetup({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const { workspaceId, databaseId } = useDatabaseEnv()
  const property = useDatabase(workspaceId, databaseId).data?.properties.find((candidate) => candidate.id === propertyId)
  if (property?.type === 'formula') return <FormulaDialog property={property} onClose={onClose} />
  if (property?.type === 'button') return <ButtonConfigDialog property={property} onClose={onClose} />
  return null
}

/** The "+" header cell: a name and a type make a new property at the end of the views. */
export function AddPropertyButton() {
  const { workspaceId, databaseId } = useDatabaseEnv()
  const { t } = useTranslation('database')
  const createProperty = useCreateProperty(workspaceId, databaseId)
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tip label={t('property.add')}>
          <PopoverTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="m-0.5 text-muted-foreground" aria-label={t('property.add')} />}>
            <Add />
          </PopoverTrigger>
        </Tip>
        <PopoverContent align="end" className="w-60 gap-0 p-0">
          <NewPropertyForm
            relations
            onCreate={(name, type, config) => {
              setOpen(false)
              // The server adds the column to the end of every view.
              createProperty.mutate({ name, type, ...(config ? { config } : {}) }, { onSuccess: (property) => setCreated(property.id) })
            }}
          />
        </PopoverContent>
      </Popover>
      {created ? <NewPropertySetup propertyId={created} onClose={() => setCreated(null)} /> : null}
    </>
  )
}

/** The config a new property is created with: only relations and rollups need one up front. */
export type NewPropertyConfig = Record<string, unknown>

/**
 * A new property's name field and type list: picking a type creates it (an empty name takes the type's label).
 * `relations`: also offers relation and rollup, which ask for their config first.
 */
export function NewPropertyForm({ onCreate, relations = false }: { onCreate: (name: string, type: DatabasePropertyType, config?: NewPropertyConfig) => void; relations?: boolean }) {
  const { t } = useTranslation('database')
  const [name, setName] = useState('')
  const [setup, setSetup] = useState<'relation' | 'rollup' | null>(null)
  const nameFor = (type: DatabasePropertyType) => (name.trim() || PROPERTY_TYPES[type].label).slice(0, 200)
  if (setup === 'relation') return <RelationSetup onBack={() => setSetup(null)} onCreate={(config) => onCreate(nameFor('relation'), 'relation', config)} />
  if (setup === 'rollup') return <RollupSetup onBack={() => setSetup(null)} onCreate={(config) => onCreate(nameFor('rollup'), 'rollup', config)} />
  const types = relations ? [...CREATABLE_TYPES, ...NEW_ONLY_TYPES] : CREATABLE_TYPES
  return (
    <Command label={t('property.typeLabel')} loop>
      <div className="p-1">
        <Input autoFocus aria-label={t('property.name')} placeholder={t('property.name')} value={name} maxLength={200} onChange={(event) => setName(event.target.value)} />
      </div>
      <CommandInput aria-label={t('property.searchTypes')} placeholder={t('property.typePlaceholder')} />
      <CommandList>
        <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">{t('property.noTypes')}</CommandEmpty>
        <CommandGroup>
          {types.map((type) => {
            const Icon = PROPERTY_TYPES[type].icon
            return (
              <CommandItem
                key={type}
                value={type}
                keywords={[PROPERTY_TYPES[type].label]}
                onSelect={() => (type === 'relation' || type === 'rollup' ? setSetup(type) : onCreate(nameFor(type), type))}
              >
                <Icon className="text-muted-foreground" />
                {PROPERTY_TYPES[type].label}
                {isComputed(type) ? <span className="ml-auto text-xs text-muted-foreground">{t('property.automatic')}</span> : null}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
