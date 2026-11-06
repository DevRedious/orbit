import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, People } from 'reicon-react'
import { ApiProblem } from '@orbit/api/problem'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { Tip } from '@/components/common/Tip'
import { problemMessage } from '@/i18n/problem'
import { useCreateView, useUpdateView, type SavedView } from '../api/views'
import { useOpenKey } from '../useOpenKey'
import { defaultViewState, type ViewState } from '../viewState'
import { VIEW_COLORS, VIEW_ICONS, VIEW_ICON_NAMES, ViewIcon } from './ViewIcon'

export type SaveViewMode = 'create' | 'save_as_new' | 'duplicate' | 'edit'
type Visibility = 'personal' | 'workspace'

export interface SaveViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: SaveViewMode
  workspaceId: string
  /** Saved as the view's state for create / save_as_new. Duplicate uses `view.state`; edit leaves state alone. */
  state: ViewState
  /** Prefills the form; required for save_as_new, duplicate, and edit. */
  view?: SavedView
  onSaved: (view: SavedView) => void
  /** Opened from the keyboard: no entrance animation. */
  instant?: boolean
}

export function SaveViewDialog({ open, onOpenChange, instant = false, ...form }: SaveViewDialogProps) {
  // callers clear their dialog state on close: the exit animation keeps showing the form it closed with
  const [closingForm, setClosingForm] = useState<typeof form | null>(null)
  const openKey = useOpenKey(open)
  const close = () => {
    setClosingForm(form)
    onOpenChange(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      onOpenChangeComplete={(next) => {
        if (!next) setClosingForm(null)
      }}
    >
      <DialogContent instant={instant} className="sm:max-w-md">
        <SaveViewForm key={openKey} {...(open ? form : (closingForm ?? form))} onClose={close} />
      </DialogContent>
    </Dialog>
  )
}

type SaveViewFormProps = Omit<SaveViewDialogProps, 'open' | 'onOpenChange' | 'instant'> & { onClose: () => void }

function SaveViewForm({ mode, workspaceId, state, view, onSaved, onClose }: SaveViewFormProps) {
  const { t } = useTranslation('views')
  const nameId = useId()
  const descriptionId = useId()
  const createView = useCreateView(workspaceId)
  const updateView = useUpdateView(workspaceId)
  const [name, setName] = useState(() => (!view || mode === 'create' ? '' : mode === 'edit' ? view.name : t('saveDialog.copyName', { name: view.name })))
  const [description, setDescription] = useState(() => (view && mode !== 'create' ? view.description : ''))
  const [icon, setIcon] = useState<string | null>(() => view?.icon ?? null)
  const [color, setColor] = useState<string | null>(() => view?.color ?? null)
  const [visibility, setVisibility] = useState<Visibility>(() => (mode === 'edit' && view ? view.visibility : 'personal'))
  const [error, setError] = useState<string | null>(null)
  const [nameMissing, setNameMissing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const canChangeVisibility = mode !== 'edit' || (view?.can_change_visibility ?? false)
  const pending = createView.isPending || updateView.isPending

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('saveDialog.nameRequired'))
      setNameMissing(true)
      return
    }
    setError(null)
    setNameMissing(false)
    try {
      const saved =
        mode === 'edit' && view
          ? await updateView.mutateAsync({
              viewId: view.id,
              body: { expected_version: view.version, name: trimmed, description: description.trim(), icon, color, ...(canChangeVisibility ? { visibility } : {}) },
            })
          : await createView.mutateAsync({
              name: trimmed,
              description: description.trim(),
              icon,
              color,
              visibility,
              state: mode === 'duplicate' ? (view?.state ?? defaultViewState()) : state,
            })
      onSaved(saved)
      onClose()
    } catch (caught) {
      if (caught instanceof ApiProblem && caught.status === 409) setError(t('saveDialog.conflict'))
      else setError(problemMessage(caught, t('saveDialog.saveFailed')))
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <DialogHeader>
        <DialogTitle>{t(`saveDialog.title.${mode}`)}</DialogTitle>
        <DialogDescription>{t(`saveDialog.description.${mode}`)}</DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor={nameId}>{t('saveDialog.name')}</FieldLabel>
        <div className="flex items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal={false}>
            <Tip label={t('saveDialog.iconAndColor')}>
              <PopoverTrigger
                render={
                  <Button type="button" variant="outline" size="icon" aria-label={t('saveDialog.chooseIconColor')}>
                    <ViewIcon icon={icon} color={color} />
                  </Button>
                }
              />
            </Tip>
            {pickerOpen ? (
              <PopoverContent align="start" className="w-64 gap-3 p-3">
                <ToggleGroup
                  aria-label={t('saveDialog.icon')}
                  size="sm"
                  spacing={1}
                  className="grid w-full grid-cols-7"
                  value={icon ? [icon] : []}
                  onValueChange={(value: string[]) => {
                    // pressing the chosen icon again keeps it
                    if (value[0]) setIcon(value[0])
                  }}
                >
                  {VIEW_ICON_NAMES.map((key) => {
                    const Icon = VIEW_ICONS[key]
                    return (
                      <ToggleGroupItem key={key} value={key} aria-label={t('saveDialog.iconAria', { icon: t(`saveDialog.icons.${key}`) })} className="px-0 text-muted-foreground aria-pressed:text-foreground">
                        <Icon aria-hidden="true" />
                      </ToggleGroupItem>
                    )
                  })}
                </ToggleGroup>
                <div role="group" aria-label={t('saveDialog.color')} className="flex flex-wrap items-center gap-1.5">
                  {VIEW_COLORS.map((swatch) => (
                    <ColorSwatch key={swatch.value} size="sm" color={swatch.value} aria-label={t(`saveDialog.colors.${swatch.name}`)} aria-pressed={color === swatch.value} onClick={() => setColor(swatch.value)} />
                  ))}
                  <ColorSwatch size="sm" color={null} aria-label={t('saveDialog.noColor')} aria-pressed={color === null} onClick={() => setColor(null)} />
                </div>
              </PopoverContent>
            ) : null}
          </Popover>
          <Input
            id={nameId}
            autoFocus
            maxLength={80}
            value={name}
            placeholder={t('saveDialog.namePlaceholder')}
            aria-invalid={(error !== null && nameMissing) || undefined}
            onChange={(event) => setName(event.target.value)}
            className="flex-1"
          />
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor={descriptionId}>{t('saveDialog.descriptionLabel')}</FieldLabel>
        <Textarea id={descriptionId} rows={2} maxLength={500} value={description} placeholder={t('saveDialog.optional')} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      {canChangeVisibility ? (
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t('saveDialog.visibility')}</span>
          <ToggleGroup
            aria-label={t('saveDialog.visibility')}
            variant="outline"
            className="w-full"
            value={[visibility]}
            onValueChange={(value: string[]) => {
              const next = value[0]
              if (next === 'personal' || next === 'workspace') setVisibility(next)
            }}
          >
            <ToggleGroupItem value="personal" className="flex-1 gap-1.5">
              <Lock className="size-3.5" aria-hidden="true" />
              {t('saveDialog.onlyMe')}
            </ToggleGroupItem>
            <ToggleGroupItem value="workspace" className="flex-1 gap-1.5">
              <People className="size-3.5" aria-hidden="true" />
              {t('saveDialog.workspace')}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('saveDialog.ownerOnly')}</p>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={pending}>{pending ? t('saveDialog.saving') : t(`saveDialog.submit.${mode}`)}</Button>
      </DialogFooter>
    </form>
  )
}
