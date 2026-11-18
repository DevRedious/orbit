import { useId, useState, type DragEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { toast } from 'sonner'
import { Add, ChevronDown, ChevronUp, Edit2, Eye, Link2, Maximize4, TickCircle, Trash } from 'reicon-react'
import { cn } from 'cn'
import { Button, buttonVariants } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { InfoTip } from '@/components/common/InfoTip'
import { Tip } from '@/components/common/Tip'
import { UserAvatar } from '@/components/common/UserAvatar'
import {
  addableProperties,
  answerState,
  answersBody,
  blockingAnswers,
  formPath,
  formQuestions,
  movedQuestion,
  withQuestion,
  type DatabaseFormConfig,
  type FormAnswers,
  type FormQuestion,
} from '@orbit/database/form'
import { numberFromEditText, options } from '@orbit/database/values'
import type { Database, Property } from '@orbit/database/types'
import { useCreateProperty } from './api'
import { NewPropertyForm } from './ColumnHeaderMenu'
import { useDatabaseEnv } from './context'
import { formErrorMessage, useSubmitForm } from './formApi'
import { GripIcon } from './GripIcon'
import { Pill } from './cells/Pill'
import { PROPERTY_TYPES } from './propertyMeta'
import { propertyTypeLabel } from './labels'
import { i18n } from '@/i18n'

const MAX_LABEL = 200
const MAX_TEXT = 2_000

interface DatabaseFormViewProps {
  database: Database
  viewId: string
  form: DatabaseFormConfig
  /** Saves the layout (view edit rules, spec D1); absent when the viewer cannot change the view. */
  onForm?: (form: DatabaseFormConfig) => void
}

/**
 * A form view inside a database (spec P3 18.2): editors build it and can preview it, everyone else fills it in. "Copy
 * form link" copies the full-page form for members; a linked view block's form link names the link.
 */
export function DatabaseFormView({ database, viewId, form, onForm }: DatabaseFormViewProps) {
  const { t } = useTranslation('database')
  const { databaseId, linkId } = useDatabaseEnv()
  const location = useLocation()
  const [preview, setPreview] = useState(false)
  const path = formPath(databaseId, viewId, linkId)
  const copyLink = () =>
    void navigator.clipboard.writeText(new URL(path, window.location.origin).toString()).then(
      () => toast.success(t('form.linkCopied')),
      () => toast.error(t('form.copyFailed')),
    )
  const building = onForm !== undefined && !preview
  // `contain` keeps the form's 640 px column out of the database page's `w-max` column, so it fits a phone.
  return (
    <div className="flex flex-col gap-3 [contain:inline-size]">
      <div className="flex items-center justify-end gap-1">
        {preview ? (
          <Link
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            to={path}
            state={{ back: `${location.pathname}${location.search}${location.hash}` } satisfies FormPageState}
          >
            <Maximize4 className="size-4" />
            {t('form.open')}
          </Link>
        ) : null}
        {onForm ? (
          <Button type="button" variant="ghost" size="sm" aria-pressed={preview} onClick={() => setPreview((current) => !current)}>
            {preview ? <Edit2 className="size-4" /> : <Eye className="size-4" />}
            {preview ? t('form.edit') : t('form.preview')}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
          <Link2 className="size-4" />
          {t('form.copyLink')}
        </Button>
      </div>
      {building ? <FormBuilder database={database} form={form} onForm={onForm} /> : <FormFill database={database} viewId={viewId} form={form} preview={preview} />}
    </div>
  )
}

/** The history state of a link to the full-page form: where its back link returns. */
export interface FormPageState {
  back: string
}

/** The form's column: the width a reader fills in comfortably. */
function FormColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 pb-10">{children}</div>
}

interface FormFillProps {
  database: Database
  viewId: string
  form: DatabaseFormConfig
  /** An editor's preview: the form can be tried, but nothing is sent. */
  preview?: boolean
}

/** The form to fill in, then the thank-you state. Required questions left empty keep it from being sent. */
export function FormFill({ database, viewId, form, preview = false }: FormFillProps) {
  const { t } = useTranslation('database')
  const { workspaceId, databaseId, canEditValues } = useDatabaseEnv()
  const submit = useSubmitForm(workspaceId, databaseId)
  const [answers, setAnswers] = useState<FormAnswers>({})
  const [tried, setTried] = useState(false)
  const [sent, setSent] = useState(false)
  const questions = formQuestions(form, database.properties)
  const blocking = new Set(blockingAnswers(questions, answers))
  const title = form.title || database.database.title || t('form.untitled')
  const closed = form.access === 'closed'

  if (sent) {
    return (
      <FormColumn>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border px-6 py-10 text-center">
          <TickCircle className="size-8 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">{preview ? t('form.sentPreview') : t('form.sent')}</h2>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{form.confirmation || t('form.confirmationDefault')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSent(false)
              setTried(false)
              setAnswers({})
            }}
          >
            {t('form.submitAnother')}
          </Button>
        </div>
      </FormColumn>
    )
  }

  const send = () => {
    setTried(true)
    if (blocking.size > 0) return
    if (preview) return setSent(true)
    submit.mutate({ viewId, answers: answersBody(questions, answers) }, { onSuccess: () => setSent(true) })
  }
  return (
    <FormColumn>
      <form
        noValidate
        aria-label={title}
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <header className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-semibold">{title}</h2>
          {form.description ? <p className="text-sm whitespace-pre-wrap text-muted-foreground">{form.description}</p> : null}
          {preview ? <p className="text-xs text-muted-foreground">{t('form.previewHint')}</p> : null}
        </header>
        {closed ? (
          <p role="status" className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
            {t('form.closed')}
          </p>
        ) : null}
        {questions.map((question) => {
          const id = `form-${viewId}-${question.property.id}`
          const raw = answers[question.property.id]
          const state = answerState(question.property, raw)
          const error = tried && blocking.has(question.property.id) ? (state === 'invalid' ? invalidText(question.property) : t('form.answerRequired')) : null
          return (
            <div key={question.property.id} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {question.label}
                {question.required ? (
                  <span className="text-destructive" aria-label={t('form.requiredMark')}>
                    {' '}
                    *
                  </span>
                ) : null}
              </label>
              {question.description ? <p className="-mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{question.description}</p> : null}
              <AnswerInput
                id={id}
                property={question.property}
                value={raw}
                invalid={error !== null}
                disabled={closed}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.property.id]: value }))}
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          )
        })}
        {submit.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {formErrorMessage(submit.error)}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={closed || submit.isPending || (!preview && !canEditValues)}>
            {form.submit_label || t('form.submit')}
          </Button>
        </div>
      </form>
    </FormColumn>
  )
}

function invalidText(property: Property): string {
  switch (property.type) {
    case 'number':
      return i18n.t('database:form.invalidNumber')
    case 'url':
      return i18n.t('database:form.invalidUrl')
    default:
      return i18n.t('database:form.invalidValue', { type: propertyTypeLabel(property.type).toLocaleLowerCase(i18n.language) })
  }
}

interface AnswerInputProps {
  id: string
  property: Property
  value: unknown
  invalid: boolean
  disabled: boolean
  onChange: (value: unknown) => void
}

/** The input of one question, by property type; it holds the answer in the API's value shape. */
function AnswerInput({ id, property, value, invalid, disabled, onChange }: AnswerInputProps) {
  const { t } = useTranslation('database')
  const text = typeof value === 'string' ? value : ''
  switch (property.type) {
    case 'text':
      return <Textarea id={id} aria-invalid={invalid || undefined} disabled={disabled} value={text} maxLength={10_000} onChange={(event) => onChange(event.target.value)} />
    case 'number':
      return <NumberInput id={id} property={property} invalid={invalid} disabled={disabled} onChange={onChange} />
    case 'checkbox':
      return (
        <span className="flex items-center gap-2 text-sm">
          <Switch id={id} disabled={disabled} checked={value === true} onCheckedChange={(checked) => onChange(checked)} />
          {value === true ? t('form.yes') : t('form.no')}
        </span>
      )
    case 'date': {
      const day = value && typeof value === 'object' && 'start' in value && typeof value.start === 'string' ? value.start : ''
      return (
        <Input
          id={id}
          type="date"
          className="w-48"
          aria-invalid={invalid || undefined}
          disabled={disabled}
          value={day}
          onChange={(event) => onChange(event.target.value ? { start: event.target.value, end: null } : null)}
        />
      )
    }
    case 'select':
    case 'status':
    case 'multi_select': {
      const multi = property.type === 'multi_select'
      const chosen = multi ? (Array.isArray(value) ? (value as string[]) : []) : typeof value === 'string' ? [value] : []
      const choices = options(property)
      if (choices.length === 0) return <p className="text-sm text-muted-foreground">{t('form.noOptions')}</p>
      return (
        <div id={id} role={multi ? 'group' : 'radiogroup'} aria-invalid={invalid || undefined} className="flex flex-wrap gap-1.5">
          {choices.map((option) => {
            const on = chosen.includes(option.id)
            const toggle = () => {
              if (!multi) return onChange(on ? null : option.id)
              onChange(on ? chosen.filter((other) => other !== option.id) : [...chosen, option.id])
            }
            return (
              <button
                key={option.id}
                type="button"
                role={multi ? 'checkbox' : 'radio'}
                aria-checked={on}
                disabled={disabled}
                className="rounded-md border border-border p-1 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary/10 disabled:opacity-50"
                onClick={toggle}
              >
                <Pill color={option.color} dot={property.type === 'status'}>
                  {option.name}
                </Pill>
              </button>
            )
          })}
        </div>
      )
    }
    case 'person':
      return <PeopleInput id={id} property={property} ids={Array.isArray(value) ? (value as string[]) : []} disabled={disabled} onChange={onChange} />
    case 'url':
      return <Input id={id} type="url" inputMode="url" placeholder="https://" aria-invalid={invalid || undefined} disabled={disabled} value={text} onChange={(event) => onChange(event.target.value)} />
    default: {
      const inputType = (property.type as string) === 'email' ? 'email' : (property.type as string) === 'phone' ? 'tel' : 'text'
      return <Input id={id} type={inputType} aria-invalid={invalid || undefined} disabled={disabled} value={text} maxLength={property.type === 'title' ? 500 : undefined} onChange={(event) => onChange(event.target.value)} />
    }
  }
}

/** Keeps the typed text, so "1." and "-" can be typed; the answer is the number it means, or the text when it is none. */
function NumberInput({ id, property, invalid, disabled, onChange }: { id: string; property: Property; invalid: boolean; disabled: boolean; onChange: (value: unknown) => void }) {
  const [text, setText] = useState('')
  return (
    <Input
      id={id}
      inputMode="decimal"
      className="w-48"
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        const typed = event.target.value.trim()
        onChange(typed === '' ? null : (numberFromEditText(property, typed) ?? typed))
      }}
    />
  )
}

function PeopleInput({ id, property, ids, disabled, onChange }: { id: string; property: Property; ids: string[]; disabled: boolean; onChange: (value: unknown) => void }) {
  const { t } = useTranslation('database')
  const { users } = useDatabaseEnv()
  const [open, setOpen] = useState(false)
  const toggle = (userId: string) => onChange(ids.includes(userId) ? ids.filter((other) => other !== userId) : [...ids, userId])
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((userId) => {
        const user = users.get(userId)
        return (
          <span key={userId} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-sm">
            <UserAvatar user={user} size={16} />
            {user?.name ?? t('form.formerMember')}
          </span>
        )
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button id={id} type="button" variant="outline" size="sm" disabled={disabled} />}>{ids.length > 0 ? t('form.changePeople') : t('form.choosePeople')}</PopoverTrigger>
        <PopoverContent align="start" className="w-64 gap-0 p-0">
          <Command label={property.name} loop>
            <CommandInput autoFocus aria-label={t('form.searchProperty', { name: property.name })} placeholder={t('form.searchPeople')} />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">{t('form.noPeople')}</CommandEmpty>
              <CommandGroup>
                {[...users.values()].map((user) => (
                  <CommandItem key={user.id} value={user.id} keywords={[user.name, user.email]} data-checked={ids.includes(user.id) || undefined} onSelect={() => toggle(user.id)}>
                    <UserAvatar user={user} size={18} />
                    <span className="truncate">{user.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** The editor's form: the texts, the questions (drag to reorder) and "+ Add question". */
function FormBuilder({ database, form, onForm }: { database: Database; form: DatabaseFormConfig; onForm: (form: DatabaseFormConfig) => void }) {
  const { t } = useTranslation('database')
  const questions = formQuestions(form, database.properties)
  const [dragged, setDragged] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const acceptingId = useId()
  const text = (key: 'title' | 'description' | 'submit_label' | 'confirmation', value: string) => {
    const { [key]: _old, ...rest } = form
    onForm(value === '' ? rest : { ...rest, [key]: value })
  }
  const drop = (event: DragEvent) => {
    event.preventDefault()
    if (dragged !== null && dropAt !== null) {
      const from = questions.findIndex((question) => question.property.id === dragged)
      onForm(movedQuestion(form, dragged, from < dropAt ? dropAt - 1 : dropAt))
    }
    setDragged(null)
    setDropAt(null)
  }
  return (
    <FormColumn>
      <div className="flex flex-col gap-2">
        <Input aria-label={t('form.titleLabel')} placeholder={database.database.title || t('form.titleLabel')} className="h-10 text-xl font-semibold md:text-xl" maxLength={MAX_LABEL} value={form.title ?? ''} onChange={(event) => text('title', event.target.value)} />
        <Textarea aria-label={t('form.descriptionLabel')} placeholder={t('form.descriptionPlaceholder')} maxLength={MAX_TEXT} value={form.description ?? ''} onChange={(event) => text('description', event.target.value)} />
      </div>
      <ol aria-label={t('form.questions')} className="flex flex-col gap-2" onDragOver={(event) => dragged !== null && event.preventDefault()} onDrop={drop}>
        {questions.map((question, index) => (
          <QuestionCard
            key={question.property.id}
            question={question}
            first={index === 0}
            last={index === questions.length - 1}
            dragging={dragged === question.property.id}
            dropBefore={dropAt === index}
            dropAfter={dropAt === questions.length && index === questions.length - 1}
            onDragStart={() => setDragged(question.property.id)}
            onDragEnd={() => {
              setDragged(null)
              setDropAt(null)
            }}
            onDragOverCard={(after) => setDropAt(after ? index + 1 : index)}
            onMove={(step) => onForm(movedQuestion(form, question.property.id, index + step))}
            onChange={(change) => onForm(withQuestion(form, question.property.id, change))}
            onRemove={() => onForm(withQuestion(form, question.property.id, null))}
          />
        ))}
      </ol>
      {questions.length === 0 ? <p className="text-sm text-muted-foreground">{t('form.noQuestions')}</p> : null}
      <AddQuestion database={database} form={form} onForm={onForm} />
      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <label htmlFor={acceptingId}>{t('form.accepting')}</label>
            <InfoTip text={t('form.acceptingHint')} />
          </span>
          <Switch id={acceptingId} checked={form.access !== 'closed'} onCheckedChange={(open) => onForm({ ...form, access: open ? 'members' : 'closed' })} />
        </div>
        <label className="flex flex-col gap-1 text-sm">
          {t('form.submitLabel')}
          <Input placeholder={t('form.submit')} maxLength={MAX_LABEL} value={form.submit_label ?? ''} onChange={(event) => text('submit_label', event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('form.confirmationLabel')}
          <Textarea placeholder={t('form.confirmationDefault')} maxLength={MAX_TEXT} value={form.confirmation ?? ''} onChange={(event) => text('confirmation', event.target.value)} />
        </label>
      </div>
    </FormColumn>
  )
}

interface QuestionCardProps {
  question: FormQuestion
  first: boolean
  last: boolean
  dragging: boolean
  dropBefore: boolean
  dropAfter: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOverCard: (after: boolean) => void
  onMove: (step: -1 | 1) => void
  onChange: (change: { label?: string; description?: string; required?: boolean }) => void
  onRemove: () => void
}

function QuestionCard({ question, first, last, dragging, dropBefore, dropAfter, onDragStart, onDragEnd, onDragOverCard, onMove, onChange, onRemove }: QuestionCardProps) {
  const { t } = useTranslation('database')
  const { property } = question
  const Icon = PROPERTY_TYPES[property.type]?.icon
  const [draggable, setDraggable] = useState(false)
  return (
    <li
      draggable={draggable}
      data-dragging={dragging || undefined}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', property.id)
        onDragStart()
      }}
      onDragEnd={() => {
        setDraggable(false)
        onDragEnd()
      }}
      onDragOver={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        onDragOverCard(event.clientY > box.top + box.height / 2)
      }}
      className={cn(
        'group/question relative flex gap-2 rounded-lg border border-border p-3 data-dragging:opacity-40',
        dropBefore && 'before:absolute before:inset-x-0 before:-top-[5px] before:h-0.5 before:bg-primary',
        dropAfter && 'after:absolute after:inset-x-0 after:-bottom-[5px] after:h-0.5 after:bg-primary',
      )}
    >
      <span
        aria-hidden="true"
        className="mt-2 cursor-grab text-muted-foreground/60"
        onPointerDown={() => setDraggable(true)}
        onPointerUp={() => setDraggable(false)}
      >
        <GripIcon />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
          <span className="truncate">{property.name}</span>
        </div>
        <Input aria-label={t('form.questionFor', { name: property.name })} placeholder={property.name} maxLength={MAX_LABEL} value={question.label === property.name ? '' : question.label} onChange={(event) => onChange({ label: event.target.value || undefined })} />
        <Input aria-label={t('form.helpFor', { name: property.name })} placeholder={t('form.helpPlaceholder')} maxLength={MAX_TEXT} className="text-xs" value={question.description} onChange={(event) => onChange({ description: event.target.value || undefined })} />
        <label className="flex items-center gap-2 pt-1 text-xs">
          <Switch size="sm" checked={question.required} onCheckedChange={(required) => onChange({ required })} />
          {t('form.required')}
        </label>
      </div>
      <div className="flex flex-col gap-0.5">
        <Tip label={t('form.moveUp')}>
          <Button type="button" variant="ghost" size="icon-xs" aria-label={t('form.moveUpLabel', { name: property.name })} disabled={first} onClick={() => onMove(-1)}>
            <ChevronUp />
          </Button>
        </Tip>
        <Tip label={t('form.moveDown')}>
          <Button type="button" variant="ghost" size="icon-xs" aria-label={t('form.moveDownLabel', { name: property.name })} disabled={last} onClick={() => onMove(1)}>
            <ChevronDown />
          </Button>
        </Tip>
        <Tip label={t('form.removeQuestion')}>
          <Button type="button" variant="ghost" size="icon-xs" aria-label={t('form.removeLabel', { name: property.name })} className="text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash />
          </Button>
        </Tip>
      </div>
    </li>
  )
}

/** Picks a property the form does not ask yet, or creates one (it is then added to every view, as from a table). */
function AddQuestion({ database, form, onForm }: { database: Database; form: DatabaseFormConfig; onForm: (form: DatabaseFormConfig) => void }) {
  const { t } = useTranslation('database')
  const { workspaceId, databaseId, canEditSchema } = useDatabaseEnv()
  const createProperty = useCreateProperty(workspaceId, databaseId)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const addable = addableProperties(form, database.properties)
  const add = (propertyId: string) => {
    setOpen(false)
    onForm({ ...form, questions: [...(form.questions ?? []), { property_id: propertyId, required: false }] })
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setCreating(false)
      }}
    >
      <PopoverTrigger render={<Button type="button" variant="ghost" size="sm" className="self-start text-muted-foreground" />}>
        <Add className="size-4" />
        {t('form.addQuestion')}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-0 p-0">
        {creating ? (
          <NewPropertyForm onCreate={(name, type) => createProperty.mutate({ name, type }, { onSuccess: (property) => add(property.id) })} />
        ) : (
          <Command label={t('form.addQuestion')} loop>
            <CommandInput autoFocus aria-label={t('form.searchProperties')} placeholder={t('form.searchPropertiesPlaceholder')} />
            <CommandList>
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">{t('form.noProperties')}</CommandEmpty>
              <CommandGroup>
                {addable.map((property) => {
                  const Icon = PROPERTY_TYPES[property.type]?.icon
                  return (
                    <CommandItem key={property.id} value={property.id} keywords={[property.name]} onSelect={() => add(property.id)}>
                      {Icon ? <Icon className="text-muted-foreground" /> : null}
                      <span className="truncate">{property.name}</span>
                    </CommandItem>
                  )
                })}
                {canEditSchema ? (
                  <CommandItem value="new-property" keywords={['new', 'create']} onSelect={() => setCreating(true)}>
                    <Add className="text-muted-foreground" />
                    {t('form.newProperty')}
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
