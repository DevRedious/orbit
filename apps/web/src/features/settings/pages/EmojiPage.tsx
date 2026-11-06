import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { SmileCircle } from 'reicon-react'
import type { CustomEmojiRecord } from '@orbit/api/generated/types.gen'
import { ApiProblem } from '@orbit/api/problem'
import { confirmAction } from '@/components/common/confirmAction'
import { EmptyState } from '@/components/common/EmptyState'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { emojiNamed, loadEmojiIndex } from '@/features/chat/lib/emojiSearch'
import { FieldGrid, RequiredMark, RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'
import { useMembers } from '@/features/workspaces/api'
import { useCreateCustomEmoji, useCustomEmoji, useDeleteCustomEmoji } from '@/features/workspaces/customEmoji'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { EMOJI_IMAGE_TYPES, emojiNameFromFile, emojiProblem } from '@/lib/customEmoji'
import { shortDate } from '@/lib/format'
import { EMOJI_SHORTCODES } from '@/lib/markdown'

/** What the server can answer to a new emoji or a delete, as catalog keys for the page. */
const SERVER_PROBLEMS = {
  chat_forbidden: 'emoji.problems.chat_forbidden',
  emoji_too_large: 'emoji.problems.emoji_too_large',
  invalid_emoji: 'invalidImage',
  validation_failed: 'emoji.problems.validation_failed',
  emoji_name_taken: 'emoji.problems.emoji_name_taken',
  emoji_limit_reached: 'emoji.problems.emoji_limit_reached',
  storage_quota_exceeded: 'storageFull',
} as const

/** The reason in words: ours for a known code, else what the server said (with the status), else that it did not answer. */
function serverProblem(t: TFunction<'settings'>, error: unknown, reason: string): string {
  if (!(error instanceof ApiProblem)) return t('noAnswer', { reason })
  if (Object.hasOwn(SERVER_PROBLEMS, error.code)) return t(SERVER_PROBLEMS[error.code as keyof typeof SERVER_PROBLEMS])
  return t('serverSaid', { reason, detail: error.detail, status: error.status, code: error.code })
}

/** The custom emoji of the workspace: add one from an image, delete one. Owners and administrators only (`chat.manage`). */
export function EmojiPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const canManage = useCan('chat.manage')
  const emoji = useCustomEmoji(workspace.id, canManage)
  const members = useMembers(canManage ? workspace.id : null)
  const createEmoji = useCreateCustomEmoji(workspace.id)
  const deleteEmoji = useDeleteCustomEmoji(workspace.id)
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  /** From the click to the answer: the emoji data loads before the request, and a second click must not send a second one. */
  const [submitting, setSubmitting] = useState(false)

  if (!canManage) return <SettingsCard title={t('emoji.title')}><p className="m-0 text-muted-foreground">{t('emoji.managersOnly')}</p></SettingsCard>

  const memberNames = new Map<string, string>(members.data?.map((member) => [member.id, member.name]))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || submitting) return
    setSubmitting(true)
    // A standard emoji keeps its name (`:joy:` becomes the character as it is typed); without the data only the server's rules apply.
    const standard = await loadEmojiIndex().catch(() => [])
    const taken = (candidate: string) =>
      Boolean(emoji.data?.some((entry) => entry.name === candidate)) || Object.hasOwn(EMOJI_SHORTCODES, candidate) || emojiNamed(standard, candidate) !== null
    const refused = emojiProblem(file, name, taken)
    setProblem(refused)
    try {
      if (refused) return
      await createEmoji.mutateAsync({ name, file })
      setFile(null)
      setName('')
      if (fileInput.current) fileInput.current.value = ''
    } catch (error) {
      setProblem(serverProblem(t, error, t('emoji.addFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(entry: CustomEmojiRecord) {
    if (!await confirmAction({ title: t('emoji.deleteTitle', { name: entry.name }), description: t('emoji.deleteDescription'), confirmLabel: t('delete'), danger: true })) return
    deleteEmoji.mutate(entry)
  }

  return <>
    <SettingsCard title={t('emoji.addTitle')} description={t('emoji.addDescription')}>
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="emoji-file">{t('image')} <RequiredMark /></FieldLabel>
            <Input
              ref={fileInput}
              id="emoji-file"
              type="file"
              accept={EMOJI_IMAGE_TYPES.join(',')}
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null
                setFile(chosen)
                setProblem(null)
                if (chosen) setName(emojiNameFromFile(chosen.name))
              }}
            />
            <FieldDescription>{t('emoji.imageHint')}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="emoji-name">{t('name')} <RequiredMark /></FieldLabel>
            <Input id="emoji-name" value={name} maxLength={32} placeholder="party_parrot" onChange={(event) => { setName(event.target.value.toLowerCase()); setProblem(null) }} />
            <FieldDescription>{t('emoji.nameHint', { name: name || t('emoji.namePlaceholder') })}</FieldDescription>
          </Field>
        </FieldGrid>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!file || !name || submitting}>{t('emoji.add')}</Button>
          {problem ? <p className="text-xs text-destructive" role="alert">{problem}</p> : null}
        </div>
      </form>
    </SettingsCard>
    {emoji.data?.length === 0 ? (
      <EmptyState icon={SmileCircle} title={t('emoji.emptyTitle')} description={t('emoji.emptyDescription')} />
    ) : (
      <SettingsCard title={t('emoji.title')} description={emoji.data ? t('emoji.count', { used: emoji.data.length }) : undefined} flush>
        <div className="flex flex-col divide-y">
          {emoji.isPending ? <SettingsRow>{t('emoji.loading')}</SettingsRow> : null}
          {emoji.isError ? <SettingsRow role="alert">{t('emoji.loadFailed')}</SettingsRow> : null}
          {emoji.data?.map((entry) => (
            <SettingsRow className="flex-nowrap" key={entry.id}>
              <RowIcon><img src={entry.url} alt="" draggable={false} className="size-6 object-contain" /></RowIcon>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium text-foreground">:{entry.name}:</span>
                <span className="truncate text-xs text-muted-foreground/70">{t('addedBy', { name: memberNames.get(entry.created_by) ?? t('formerMember'), date: shortDate(entry.created_at) })}</span>
              </div>
              <Button variant="ghost" type="button" aria-label={t('emoji.deleteAria', { name: entry.name })} disabled={deleteEmoji.isPending} onClick={() => void remove(entry)}>{t('delete')}</Button>
            </SettingsRow>
          ))}
          {deleteEmoji.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{serverProblem(t, deleteEmoji.error, t('emoji.deleteFailed'))}</SettingsRow> : null}
        </div>
      </SettingsCard>
    )}
  </>
}
