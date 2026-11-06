import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Hashtag } from 'reicon-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { ChannelInput } from '@/features/chat/api/client'
import { useUpdateChannel } from '@/features/chat/api/mutations'
import { useCategories, useConversation } from '@/features/chat/api/queries'
import { ChatError, type Conversation } from '@/features/chat/api/types'
import { CHANNEL_NAME_MAX, channelNameFinal, channelNameInput, chatErrorMessage } from './channelLib'

const NO_CATEGORY = 'none'

interface EditChannelDialogProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Name, topic, category and visibility of a channel. The form is mounted only while the dialog is open, so it starts from the saved values each time. */
export function EditChannelDialog({ conversationId, open, onOpenChange }: EditChannelDialogProps) {
  const { t } = useTranslation('chat')
  const conversation = useConversation(conversationId).data
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogs.edit.title')}</DialogTitle>
        </DialogHeader>
        {conversation && conversation.kind !== 'dm' ? (
          <EditChannelForm conversation={conversation} onDone={() => onOpenChange(false)} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('dialogs.edit.unavailable')}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditChannelForm({ conversation, onDone }: { conversation: Conversation; onDone: () => void }) {
  const { t } = useTranslation('chat')
  const categories = useCategories().data ?? []
  const updateChannel = useUpdateChannel()
  const [name, setName] = useState(conversation.name)
  const [topic, setTopic] = useState(conversation.topic)
  const [category, setCategory] = useState(conversation.categoryId ?? NO_CATEGORY)
  const [isPrivate, setIsPrivate] = useState(conversation.kind === 'private')
  const nameId = useId()
  const topicId = useId()
  const categoryId = useId()
  const privateId = useId()

  const finalName = channelNameFinal(name)
  const nameTaken = updateChannel.error instanceof ChatError && updateChannel.error.code === 'conflict'
  const categoryOptions = [{ value: NO_CATEGORY, label: t('dialogs.channel.noCategory') }, ...categories.map((item) => ({ value: item.id, label: item.name }))]
  const categoryValue = categoryOptions.some((option) => option.value === category) ? category : NO_CATEGORY

  const submit = async () => {
    if (!finalName || updateChannel.isPending) return
    // only what changed is sent, so a save does not undo somebody else's change to another field
    const patch: Partial<ChannelInput> = {}
    if (finalName !== conversation.name) patch.name = finalName
    if (topic.trim() !== conversation.topic) patch.topic = topic.trim()
    const nextCategoryId = categoryValue === NO_CATEGORY ? null : categoryValue
    if (nextCategoryId !== conversation.categoryId) patch.categoryId = nextCategoryId
    const nextKind = isPrivate ? 'private' : 'public'
    if (nextKind !== conversation.kind) patch.kind = nextKind
    if (Object.keys(patch).length === 0) return onDone()
    try {
      await updateChannel.mutateAsync({ conversationId: conversation.id, patch })
      onDone()
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
            value={name}
            aria-invalid={nameTaken || undefined}
            onChange={(event) => {
              setName(channelNameInput(event.target.value))
              if (updateChannel.isError) updateChannel.reset()
            }}
          />
        </InputGroup>
        {nameTaken ? <FieldError>{t('dialogs.channel.nameTaken')}</FieldError> : null}
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

      <Field orientation="horizontal" data-disabled={conversation.isDefault || undefined}>
        <FieldContent>
          <FieldLabel htmlFor={privateId}>{t('dialogs.edit.private')}</FieldLabel>
          <FieldDescription>
            {conversation.isDefault
              ? t('dialogs.edit.defaultChannel', { name: conversation.name })
              : isPrivate
                ? t('dialogs.edit.privateHint')
                : t('dialogs.channel.publicHint')}
          </FieldDescription>
        </FieldContent>
        <Switch id={privateId} checked={isPrivate} disabled={conversation.isDefault} onCheckedChange={setIsPrivate} />
      </Field>

      {updateChannel.isError && !nameTaken ? (
        <p role="alert" className="text-sm text-destructive">
          {chatErrorMessage(updateChannel.error, t('dialogs.edit.saveFailed'), {
            forbidden: t('dialogs.edit.forbidden'),
            not_found: t('dialogs.edit.notFound'),
          })}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('dialogs.cancel')}</DialogClose>
        <Button type="submit" disabled={!finalName || updateChannel.isPending}>
          {updateChannel.isPending ? t('dialogs.edit.saving') : t('dialogs.edit.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
