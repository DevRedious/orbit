import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useChatContext } from '@/features/chat/api/chatContext'
import { useOpenDm } from '@/features/chat/api/mutations'
import { useChatNavigation } from '@/features/chat/useChatNavigation'
import { useMembers } from '@/features/workspaces/api'
import { chatErrorMessage, messageablePeople } from './channelLib'
import { MemberPicker } from './MemberPicker'

interface NewMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Picks one or more people and opens the direct message with exactly them: the existing one, or a new one. Picking
 * only yourself opens the DM with yourself, a place for notes.
 */
export function NewMessageDialog({ open, onOpenChange }: NewMessageDialogProps) {
  const { t } = useTranslation('chat')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogs.newMessage.title')}</DialogTitle>
          <DialogDescription>{t('dialogs.newMessage.description')}</DialogDescription>
        </DialogHeader>
        <NewMessageForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function NewMessageForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('chat')
  const { workspaceId, currentUserId } = useChatContext()
  const members = useMembers(workspaceId).data ?? []
  const openDm = useOpenDm()
  const { openConversation } = useChatNavigation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const submit = async () => {
    if (selectedIds.length === 0 || openDm.isPending) return
    try {
      // the server adds the caller to every DM: only yourself is the DM with yourself
      const conversation = await openDm.mutateAsync(selectedIds.filter((id) => id !== currentUserId))
      onDone()
      openConversation(conversation.id)
    } catch {
      // The choice stays; the error shows above the buttons.
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
      <MemberPicker
        autoFocus
        label={t('dialogs.newMessage.to')}
        people={messageablePeople(members, currentUserId)}
        selectedIds={selectedIds}
        onChange={(ids) => {
          setSelectedIds(ids)
          if (openDm.isError) openDm.reset()
        }}
      />
      {openDm.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {chatErrorMessage(openDm.error, t('dialogs.newMessage.openFailed'), { not_found: t('dialogs.newMessage.notFound') })}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('dialogs.cancel')}</DialogClose>
        <Button type="submit" disabled={selectedIds.length === 0 || openDm.isPending}>
          {t('dialogs.newMessage.open')}
        </Button>
      </DialogFooter>
    </form>
  )
}
