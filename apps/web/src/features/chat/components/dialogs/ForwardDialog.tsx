import { useRef, useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useChatContext } from '@/features/chat/api/chatContext'
import { useForwardMessage, useSendMessage } from '@/features/chat/api/mutations'
import { useConversations } from '@/features/chat/api/queries'
import { ChatError, MESSAGE_MAX_LENGTH, type Conversation, type Message } from '@/features/chat/api/types'
import { chatErrorReason } from '@/features/chat/components/dialogs/channelLib'
import { conversationTitle, useChatPeople } from '@/features/chat/components/messages/people'
import { MessageByline } from '@/features/chat/components/panes/MessageByline'
import { ConversationIcon } from '@/features/chat/components/sidebar/ConversationIcon'
import { replaceEmoticons } from '@/features/chat/lib/emoticons'
import { FORWARD_LIMIT, forwardDestinations, forwardToEach, toggleDestination } from '@/features/chat/lib/forward'
import { decodeMentions, encodeMentions } from '@/features/chat/lib/mentionTokens'
import { extractPreview, wordlessPreview } from '@/lib/messagePreview'

interface ForwardDialogProps {
  message: Message
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where focus goes when the dialog closes: the message's row. */
  finalFocus?: ComponentProps<typeof DialogContent>['finalFocus']
}

/**
 * Forwards a message to up to five conversations: the channels the user can write in and the DMs, with a search field,
 * and an optional message of the user that is sent to each one right after the forward.
 */
export function ForwardDialog({ message, open, onOpenChange, finalFocus }: ForwardDialogProps) {
  const { t } = useTranslation('chat')
  const [pending, setPending] = useState(false)
  return (
    // While the forward runs the dialog stays: closing it would hide a failure.
    <Dialog open={open} onOpenChange={(next) => { if (next || !pending) onOpenChange(next) }}>
      <DialogContent finalFocus={finalFocus} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogs.forward.title')}</DialogTitle>
          <DialogDescription>{t('dialogs.forward.description', { count: FORWARD_LIMIT })}</DialogDescription>
        </DialogHeader>
        <ForwardForm message={message} pending={pending} setPending={setPending} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface ForwardFormProps {
  message: Message
  /** The forward runs. The dialog holds it, because it must not close meanwhile. */
  pending: boolean
  setPending: (pending: boolean) => void
  onDone: () => void
}

function ForwardForm({ message, pending, setPending, onDone }: ForwardFormProps) {
  const { t } = useTranslation('chat')
  const { currentUserId } = useChatContext()
  const people = useChatPeople()
  const conversations = useConversations().data ?? []
  const { mutateAsync: forwardMessage } = useForwardMessage()
  const { send } = useSendMessage()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  // One nonce for each destination: a forward that goes again after a failure gives the first copy, not a second one.
  const nonces = useRef(new Map<string, string>())

  const titleOf = (conversation: Conversation) => conversationTitle(conversation, people, currentUserId)
  const destinations = forwardDestinations(conversations, titleOf, search)
  const text = extractPreview(decodeMentions(message.body, people.members, people.channels))
  const files = message.attachments.length

  function nonceFor(conversationId: string): string {
    const nonce = nonces.current.get(conversationId) ?? crypto.randomUUID()
    nonces.current.set(conversationId, nonce)
    return nonce
  }

  async function submit() {
    if (selectedIds.length === 0 || pending) return
    // The same stored form as a message from the composer.
    const body = encodeMentions(replaceEmoticons(comment.trim()), people.members, people.channels)
    setPending(true)
    setError(null)
    const result = await forwardToEach(
      selectedIds,
      (conversationId) => forwardMessage({ messageId: message.id, conversationId, nonce: nonceFor(conversationId) }),
      body ? (conversationId) => send({ conversationId, body }) : undefined,
    )
    setPending(false)
    const titles = result.sentIds.flatMap((id) => conversations.filter((conversation) => conversation.id === id).map(titleOf))
    if (result.sentIds.length === selectedIds.length) {
      onDone()
      toast.success(titles.length === 1 ? t('dialogs.forward.forwardedTo', { title: titles[0] }) : t('dialogs.forward.forwardedToMany', { count: result.sentIds.length }))
      return
    }
    // The failed destination and those after it stay selected, so Send tries them again.
    const failed = conversations.find((conversation) => conversation.id === selectedIds[result.sentIds.length])
    const reason = (result.error instanceof ChatError && chatErrorReason(result.error)) || t('dialogs.forward.failed')
    setSelectedIds(selectedIds.filter((id) => !result.sentIds.includes(id)))
    setError(failed ? t('dialogs.forward.failedIn', { title: titleOf(failed), reason }) : reason)
  }

  return (
    <form
      className="grid min-w-0 gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div data-slot="forward-preview" className="grid min-w-0 gap-1 border-l-4 border-muted-foreground/40 pl-3">
        <MessageByline message={message} members={people.members} />
        {text ? <p className="line-clamp-2 text-[13px] wrap-anywhere text-muted-foreground">{text}</p> : null}
        {!text && message.stickerId ? <p className="text-[13px] text-muted-foreground">{wordlessPreview(true)}</p> : null}
        {files > 0 ? <p className="text-xs text-muted-foreground">{t('dialogs.forward.files', { count: files })}</p> : null}
      </div>
      <Command shouldFilter={false} label={t('dialogs.forward.forwardTo')} className="h-auto gap-1 bg-transparent p-0">
        <CommandInput autoFocus placeholder={t('dialogs.forward.search')} value={search} onValueChange={setSearch} />
        <CommandList className="h-56 max-h-[40dvh]">
          <CommandEmpty>{t('dialogs.forward.noMatch')}</CommandEmpty>
          {destinations.map((conversation) => {
            const checked = selectedIds.includes(conversation.id)
            return (
              <CommandItem
                key={conversation.id}
                value={conversation.id}
                data-checked={checked}
                disabled={pending || (!checked && selectedIds.length >= FORWARD_LIMIT)}
                className="gap-2.5"
                onSelect={() => {
                  setSelectedIds(toggleDestination(selectedIds, conversation.id))
                  setError(null)
                }}
              >
                <ConversationIcon conversation={conversation} people={people.members} currentUserId={currentUserId} size={20} />
                <span className="truncate">{conversation.kind === 'dm' ? titleOf(conversation) : conversation.name}</span>
              </CommandItem>
            )
          })}
        </CommandList>
      </Command>
      <Input
        aria-label={t('dialogs.forward.message')}
        placeholder={t('dialogs.forward.messagePlaceholder')}
        maxLength={MESSAGE_MAX_LENGTH}
        value={comment}
        disabled={pending}
        onChange={(event) => setComment(event.target.value)}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <DialogFooter className="sm:items-center">
        <span className="text-xs text-muted-foreground sm:mr-auto">
          {t('dialogs.forward.selected', { count: selectedIds.length, limit: FORWARD_LIMIT })}
        </span>
        <DialogClose disabled={pending} render={<Button type="button" variant="outline" />}>{t('dialogs.cancel')}</DialogClose>
        <Button type="submit" disabled={selectedIds.length === 0 || pending}>
          {pending ? t('dialogs.forward.sending') : t('dialogs.forward.send')}
        </Button>
      </DialogFooter>
    </form>
  )
}
