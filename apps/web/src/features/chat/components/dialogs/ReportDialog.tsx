import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { ChatReportReason } from '@orbit/api/generated/types.gen'
import { InfoTip } from '@/components/common/InfoTip'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useChatContext } from '../../api/chatContext'
import { REPORT_NOTE_MAX, REPORT_REASONS, useReportMessage } from '../../api/moderation'
import type { Message } from '../../api/types'

/** Reports a message to the workspace owners and admins: a reason and an optional note. Mounted while open. */
export function ReportDialog({ message, onClose }: { message: Message; onClose: () => void }) {
  const { t } = useTranslation('chat')
  const { workspaceId } = useChatContext()
  const report = useReportMessage(workspaceId)
  const [reason, setReason] = useState<ChatReportReason | null>(null)
  const [note, setNote] = useState('')
  const noteId = useId()

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!reason) return
    report.mutate(
      { messageId: message.id, reason, note },
      {
        onSuccess: () => {
          toast.success(t('dialogs.report.sent'))
          onClose()
        },
        onError: () => toast.error(t('dialogs.report.failed')),
      },
    )
  }

  return (
    <Modal title={t('dialogs.report.title')} onClose={onClose} className="sm:max-w-md" dismissible={!report.isPending}>
      <form className="grid gap-4" onSubmit={submit}>
        <FieldSet>
          <FieldLegend variant="label">{t('dialogs.report.reason')}</FieldLegend>
          <RadioGroup value={reason} onValueChange={(value) => setReason(value as ChatReportReason)}>
            {Object.entries(REPORT_REASONS).map(([value, label]) => (
              <Label key={value} className="font-normal">
                <RadioGroupItem value={value} />
                {label}
              </Label>
            ))}
          </RadioGroup>
        </FieldSet>
        <Field>
          <FieldLabel htmlFor={noteId} className="items-center gap-1.5">
            {t('dialogs.report.note')} <InfoTip text={t('dialogs.report.noteHint')} />
          </FieldLabel>
          <Textarea id={noteId} rows={3} maxLength={REPORT_NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={report.isPending} />}>{t('dialogs.cancel')}</DialogClose>
          <Button type="submit" disabled={!reason || report.isPending}>
            {t('dialogs.report.submit')}
          </Button>
        </DialogFooter>
      </form>
    </Modal>
  )
}
