import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Hashtag, Lock } from 'reicon-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useChatContext } from '@/features/chat/api/chatContext'
import { useCreateChannel } from '@/features/chat/api/mutations'
import { useCategories } from '@/features/chat/api/queries'
import { ChatError } from '@/features/chat/api/types'
import { useChatNavigation } from '@/features/chat/useChatNavigation'
import { useMembers } from '@/features/workspaces/api'
import { CHANNEL_NAME_MAX, channelNameFinal, channelNameInput, chatErrorMessage, pickablePeople } from './channelLib'
import { MemberPicker } from './MemberPicker'

const NO_CATEGORY = 'none'

interface NewChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category the dialog was opened from. */
  defaultCategoryId?: string | null
  /** A name to start with (Browse channels passes the text that matched nothing). */
  defaultName?: string
}

/** Creates a public or private channel, then opens it. The form is mounted only while the dialog is open, so it starts empty each time. */
export function NewChannelDialog({ open, onOpenChange, defaultCategoryId, defaultName }: NewChannelDialogProps) {
  const { t } = useTranslation('chat')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogs.newChannel.title')}</DialogTitle>
          <DialogDescription>{t('dialogs.newChannel.description')}</DialogDescription>
        </DialogHeader>
        <NewChannelForm defaultCategoryId={defaultCategoryId ?? null} defaultName={defaultName ?? ''} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function NewChannelForm({ defaultCategoryId, defaultName, onDone }: { defaultCategoryId: string | null; defaultName: string; onDone: () => void }) {
  const { t } = useTranslation('chat')
  const { workspaceId, currentUserId } = useChatContext()
  const categories = useCategories().data ?? []
  const members = useMembers(workspaceId).data ?? []
  const createChannel = useCreateChannel()
  const { openConversation } = useChatNavigation()
  const [name, setName] = useState(() => channelNameInput(defaultName))
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState(defaultCategoryId ?? NO_CATEGORY)
  const [kind, setKind] = useState<'public' | 'private'>('public')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const nameId = useId()
  const topicId = useId()
  const categoryId = useId()

  const finalName = channelNameFinal(name)
  const nameTaken = createChannel.error instanceof ChatError && createChannel.error.code === 'conflict'
  const categoryOptions = [{ value: NO_CATEGORY, label: t('dialogs.channel.noCategory') }, ...categories.map((item) => ({ value: item.id, label: item.name }))]
  // the categories can still load when the dialog opens, and the default one can be gone
  const categoryValue = categoryOptions.some((option) => option.value === category) ? category : NO_CATEGORY

  const submit = async () => {
    if (!finalName || createChannel.isPending) return
    try {
      const channel = await createChannel.mutateAsync({
        name: finalName,
        topic: topic.trim(),
        categoryId: categoryValue === NO_CATEGORY ? null : categoryValue,
        kind,
        memberIds: kind === 'private' ? memberIds : [],
      })
      onDone()
      openConversation(channel.id)
    } catch {
      // The form stays; the error shows under the name or above the buttons.
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Field data-invalid={nameTaken || undefined}>
        <FieldLabel htmlFor={nameId}>{t('dialogs.channel.name')}</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Hashtag aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            id={nameId}
            autoFocus
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={CHANNEL_NAME_MAX}
            placeholder={t('dialogs.newChannel.namePlaceholder')}
            value={name}
            aria-invalid={nameTaken || undefined}
            onChange={(event) => {
              setName(channelNameInput(event.target.value))
              if (createChannel.isError) createChannel.reset()
            }}
          />
        </InputGroup>
        {nameTaken ? <FieldError>{t('dialogs.channel.nameTaken')}</FieldError> : <FieldDescription>{t('dialogs.newChannel.nameHint')}</FieldDescription>}
      </Field>

      <Field>
        <FieldLabel htmlFor={topicId}>{t('dialogs.channel.topic')}</FieldLabel>
        <Input id={topicId} value={topic} maxLength={250} placeholder={t('dialogs.channel.topicPlaceholder')} onChange={(event) => setTopic(event.target.value)} />
      </Field>

      <Field>
        <FieldLabel htmlFor={categoryId}>{t('dialogs.channel.category')}</FieldLabel>
        <Select items={categoryOptions} value={categoryValue} onValueChange={(value) => setCategory(value as string)}>
          <SelectTrigger id={categoryId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <FieldSet className="gap-0">
        <FieldLegend variant="label">{t('dialogs.newChannel.visibility')}</FieldLegend>
        <ToggleGroup
          variant="outline"
          orientation="vertical"
          className="w-full"
          value={[kind]}
          onValueChange={(value) => {
            // a press on the chosen one must not leave the channel without a kind
            const next = value.at(-1)
            if (next === 'public' || next === 'private') setKind(next)
          }}
        >
          <ToggleGroupItem value="public" className="h-auto flex-col items-start gap-0.5 py-2 whitespace-normal">
            <span className="flex items-center gap-1.5">
              <Hashtag aria-hidden />
              {t('dialogs.newChannel.public')}
            </span>
            <span className="text-xs font-normal text-muted-foreground">{t('dialogs.channel.publicHint')}</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="private" className="h-auto flex-col items-start gap-0.5 py-2 whitespace-normal">
            <span className="flex items-center gap-1.5">
              <Lock aria-hidden />
              {t('dialogs.newChannel.private')}
            </span>
            <span className="text-xs font-normal text-muted-foreground">{t('dialogs.newChannel.privateHint')}</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </FieldSet>

      {kind === 'private' ? (
        <Field>
          <FieldLabel>{t('dialogs.newChannel.addPeople')}</FieldLabel>
          <MemberPicker label={t('dialogs.newChannel.addPeople')} people={pickablePeople(members, currentUserId)} selectedIds={memberIds} onChange={setMemberIds} />
          <FieldDescription>{t('dialogs.newChannel.addPeopleHint')}</FieldDescription>
        </Field>
      ) : null}

      {createChannel.isError && !nameTaken ? (
        <p role="alert" className="text-sm text-destructive">
          {chatErrorMessage(createChannel.error, t('dialogs.newChannel.createFailed'), { not_found: t('dialogs.newChannel.categoryGone') })}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('dialogs.cancel')}</DialogClose>
        <Button type="submit" disabled={!finalName || createChannel.isPending}>
          {createChannel.isPending ? t('dialogs.newChannel.creating') : t('dialogs.newChannel.create')}
        </Button>
      </DialogFooter>
    </form>
  )
}
