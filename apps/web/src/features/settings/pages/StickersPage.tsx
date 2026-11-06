import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Sticker } from 'reicon-react'
import type { CustomStickerRecord } from '@orbit/api/generated/types.gen'
import { ApiProblem } from '@orbit/api/problem'
import { confirmAction } from '@/components/common/confirmAction'
import { EmptyState } from '@/components/common/EmptyState'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FieldGrid, RequiredMark, SettingsRow } from '@/features/settings/components/SettingsParts'
import { useMembers } from '@/features/workspaces/api'
import { useCreateCustomSticker, useCustomStickers, useDeleteCustomSticker } from '@/features/workspaces/customStickers'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { STICKER_IMAGE_TYPES, STICKER_NAME_MAX, stickerNameFromFile, stickerProblem } from '@/lib/customSticker'
import { shortDate } from '@/lib/format'

/** What the server can answer to a new sticker or a delete, as catalog keys for the page. */
const SERVER_PROBLEMS = {
  chat_forbidden: 'stickers.problems.chat_forbidden',
  sticker_too_large: 'stickers.problems.sticker_too_large',
  storage_quota_exceeded: 'storageFull',
  invalid_sticker: 'invalidImage',
  validation_failed: 'stickers.problems.validation_failed',
  sticker_name_taken: 'stickers.problems.sticker_name_taken',
  sticker_limit_reached: 'stickers.problems.sticker_limit_reached',
} as const

/** The reason in words: ours for a known code, else what the server said (with the status), else that it did not answer. */
function serverProblem(t: TFunction<'settings'>, error: unknown, reason: string): string {
  if (!(error instanceof ApiProblem)) return t('noAnswer', { reason })
  if (Object.hasOwn(SERVER_PROBLEMS, error.code)) return t(SERVER_PROBLEMS[error.code as keyof typeof SERVER_PROBLEMS])
  return t('serverSaid', { reason, detail: error.detail, status: error.status, code: error.code })
}

/** The stickers of the workspace: add one from an image, delete one. Owners and administrators only (`chat.manage`). */
export function StickersPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const canManage = useCan('chat.manage')
  const stickers = useCustomStickers(workspace.id, canManage)
  const members = useMembers(canManage ? workspace.id : null)
  const createSticker = useCreateCustomSticker(workspace.id)
  const deleteSticker = useDeleteCustomSticker(workspace.id)
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  /** From the click to the answer: a second click must not send a second sticker. */
  const [submitting, setSubmitting] = useState(false)

  if (!canManage) return <SettingsCard title={t('stickers.title')}><p className="m-0 text-muted-foreground">{t('stickers.managersOnly')}</p></SettingsCard>

  const memberNames = new Map<string, string>(members.data?.map((member) => [member.id, member.name]))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file || submitting) return
    const refused = stickerProblem(file, name, stickers.data?.map((entry) => entry.name) ?? [])
    setProblem(refused)
    if (refused) return
    setSubmitting(true)
    try {
      await createSticker.mutateAsync({ name: name.trim(), file })
      setFile(null)
      setName('')
      if (fileInput.current) fileInput.current.value = ''
    } catch (error) {
      setProblem(serverProblem(t, error, t('stickers.addFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(entry: CustomStickerRecord) {
    if (!await confirmAction({ title: t('stickers.deleteTitle', { name: entry.name }), description: t('stickers.deleteDescription'), confirmLabel: t('delete'), danger: true })) return
    deleteSticker.mutate(entry)
  }

  return <>
    <SettingsCard title={t('stickers.addTitle')} description={t('stickers.addDescription')}>
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="sticker-file">{t('image')} <RequiredMark /></FieldLabel>
            <Input
              ref={fileInput}
              id="sticker-file"
              type="file"
              accept={STICKER_IMAGE_TYPES.join(',')}
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null
                setFile(chosen)
                setProblem(null)
                if (chosen) setName(stickerNameFromFile(chosen.name))
              }}
            />
            <FieldDescription>{t('stickers.imageHint')}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="sticker-name">{t('name')} <RequiredMark /></FieldLabel>
            <Input id="sticker-name" value={name} maxLength={STICKER_NAME_MAX} placeholder={t('stickers.namePlaceholder')} onChange={(event) => { setName(event.target.value); setProblem(null) }} />
            <FieldDescription>{t('stickers.nameHint')}</FieldDescription>
          </Field>
        </FieldGrid>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!file || !name.trim() || submitting}>{t('stickers.add')}</Button>
          {problem ? <p className="text-xs text-destructive" role="alert">{problem}</p> : null}
        </div>
      </form>
    </SettingsCard>
    {stickers.data?.length === 0 ? (
      <EmptyState icon={Sticker} title={t('stickers.emptyTitle')} description={t('stickers.emptyDescription')} />
    ) : (
      <SettingsCard title={t('stickers.title')} description={stickers.data ? t('stickers.count', { used: stickers.data.length }) : undefined} flush>
        <div className="flex flex-col divide-y">
          {stickers.isPending ? <SettingsRow>{t('stickers.loading')}</SettingsRow> : null}
          {stickers.isError ? <SettingsRow role="alert">{t('stickers.loadFailed')}</SettingsRow> : null}
          {stickers.data?.map((entry) => (
            <SettingsRow className="flex-nowrap" key={entry.id}>
              <img src={entry.url} alt="" draggable={false} loading="lazy" className="size-16 shrink-0 object-contain" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium text-foreground">{entry.name}</span>
                <span className="truncate text-xs text-muted-foreground/70">{t('addedBy', { name: memberNames.get(entry.created_by) ?? t('formerMember'), date: shortDate(entry.created_at) })}</span>
              </div>
              <Button variant="ghost" type="button" aria-label={t('stickers.deleteAria', { name: entry.name })} disabled={deleteSticker.isPending} onClick={() => void remove(entry)}>{t('delete')}</Button>
            </SettingsRow>
          ))}
          {deleteSticker.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{serverProblem(t, deleteSticker.error, t('stickers.deleteFailed'))}</SettingsRow> : null}
        </div>
      </SettingsCard>
    )}
  </>
}
