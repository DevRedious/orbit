import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SmileCircle } from 'reicon-react'
import { Emoji } from '@/components/common/Emoji'
import { EmojiPicker } from '@/components/common/EmojiPicker'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { Tip } from '@/components/common/Tip'
import { DialogFooter } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSetStatus } from '@/features/auth/api'
import { useOwnStatus } from '@/features/realtime/useOwnStatus'

type ClearAfter = 'keep' | 'never' | '30m' | '1h' | '4h' | 'today'

/** The choices after `keep`; their names are `shell:status.dialog.options.<value>`. */
const CLEAR_AFTER_OPTIONS = ['never', '30m', '1h', '4h', 'today'] as const satisfies readonly ClearAfter[]

const MINUTES: Partial<Record<ClearAfter, number>> = { '30m': 30, '1h': 60, '4h': 240 }

/** When the custom status ends; "Today" is the end of the local day. `keep` leaves the end that is set. */
function clearAfterTime(choice: ClearAfter, current: string | null, now = new Date()): string | null {
  if (choice === 'keep') return current
  if (choice === 'never') return null
  if (choice === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
  return new Date(now.getTime() + (MINUTES[choice] ?? 0) * 60_000).toISOString()
}

/**
 * Sets or clears the signed-in user's custom status (emoji, text and when it ends). The presence stays as it is.
 * Callers mount it while it is open.
 */
export function CustomStatusDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation(['shell', 'common'])
  const status = useOwnStatus()
  const setStatus = useSetStatus()
  const [emoji, setEmoji] = useState(status.emoji)
  const [text, setText] = useState(status.text ?? '')
  // A status that already has an end keeps it unless the user picks another one.
  const [choices] = useState<ClearAfter[]>(() => (status.expiresAt ? ['keep', ...CLEAR_AFTER_OPTIONS] : [...CLEAR_AFTER_OPTIONS]))
  const options = choices.map((value) => ({
    value,
    label: value === 'keep'
      ? t('status.dialog.keep', { date: new Date(status.expiresAt ?? 0).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }) })
      : t(`status.dialog.options.${value}`),
  }))
  const [clearAfter, setClearAfter] = useState<ClearAfter>(options[0].value)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const textId = useId()
  const hadCustom = status.emoji !== null || status.text !== null

  const save = (custom: { emoji: string | null; text: string | null; expires_at: string | null }) => {
    if (setStatus.isPending) return
    // a failure keeps the dialog and what was typed; the mutation says what went wrong
    setStatus.mutate({ presence: status.presence, ...custom }, { onSuccess: onClose })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim() || null
    const empty = emoji === null && trimmed === null
    save({ emoji, text: trimmed, expires_at: empty ? null : clearAfterTime(clearAfter, status.expiresAt) })
  }

  return (
    <Modal title={t('status.dialog.title')} onClose={onClose} className="sm:max-w-md" dismissible={!setStatus.isPending}>
      <form className="grid gap-4" onSubmit={submit}>
        <Field>
          <FieldLabel htmlFor={textId}>{t('status.dialog.status')}</FieldLabel>
          <div className="flex items-center gap-2">
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen} modal={false}>
              <Tip label={emoji ? t('status.dialog.changeEmoji') : t('status.dialog.addEmoji')}>
                <PopoverTrigger render={<Button type="button" variant="outline" size="icon" aria-label={emoji ? t('status.dialog.changeEmoji') : t('status.dialog.addEmoji')} />}>
                  {emoji ? <Emoji value={emoji} /> : <SmileCircle className="text-muted-foreground" />}
                </PopoverTrigger>
              </Tip>
              <PopoverContent align="start" className="w-auto gap-0 p-0">
                <EmojiPicker
                  onPick={(picked) => {
                    setEmoji(picked)
                    setEmojiOpen(false)
                  }}
                  onRemove={
                    emoji
                      ? () => {
                          setEmoji(null)
                          setEmojiOpen(false)
                        }
                      : undefined
                  }
                />
              </PopoverContent>
            </Popover>
            <Input
              id={textId}
              autoFocus
              className="min-w-0 flex-1"
              maxLength={100}
              placeholder={t('status.dialog.placeholder')}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
        </Field>
        <Field>
          <FieldLabel>{t('status.dialog.clearAfter')}</FieldLabel>
          <Select items={options} value={clearAfter} onValueChange={(value) => setClearAfter(value as ClearAfter)}>
            <SelectTrigger aria-label={t('status.dialog.clearAfter')} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={!hadCustom || setStatus.isPending} onClick={() => save({ emoji: null, text: null, expires_at: null })}>
            {t('status.dialog.clear')}
          </Button>
          <Button type="submit" disabled={setStatus.isPending || (!hadCustom && emoji === null && !text.trim())}>
            {t('common:save')}
          </Button>
        </DialogFooter>
      </form>
    </Modal>
  )
}
