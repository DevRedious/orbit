import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { MailLabel } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateMailLabel, useDeleteMailLabel, useUpdateMailLabel } from '@/features/mail/api/mutations'
import { useMailLabels } from '@/features/mail/api/queries'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { LABEL_COLORS, LabelColorPicker, LabelPill } from '@/features/tasks/components/TaskLabels'
import { useCan } from '@/features/workspaces/permissions'
import { MailManagersOnly } from './MailDomainsPage'
import { mailProblem } from './mailSettingsLib'

function LabelForm({ initial, submitLabel, pending, onSubmit, onCancel }: {
  initial?: MailLabel
  submitLabel: string
  pending: boolean
  onSubmit: (name: string, color: string) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useTranslation('settings')
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? LABEL_COLORS[0]!)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || pending) return
    try {
      await onSubmit(trimmed, color)
      if (!initial) setName('')
    } catch {
      // the page shows the mutation error
    }
  }
  return (
    <form className="flex w-full flex-wrap items-center gap-3" onSubmit={(event) => void submit(event)}>
      <Input className="w-full max-w-[260px]" aria-label={t('mail.labels.name')} placeholder={t('mail.labels.name')} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoFocus={Boolean(initial)} />
      <LabelColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <Button type="submit" disabled={!name.trim() || pending}>{submitLabel}</Button>
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>{t('cancel')}</Button> : null}
      </div>
    </form>
  )
}

/** The workspace's mail labels: create, rename, recolor, delete. Every member can put them on the threads they read. */
export function MailLabelsPage() {
  const { t } = useTranslation('settings')
  if (!useCan('mail.manage')) return <MailManagersOnly title={t('mail.labels.title')} />
  return <MailLabels />
}

function MailLabels() {
  const { t } = useTranslation('settings')
  const labels = useMailLabels()
  const create = useCreateMailLabel()
  const update = useUpdateMailLabel()
  const remove = useDeleteMailLabel()
  const [editingId, setEditingId] = useState<string>()
  const sorted = [...(labels.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))

  async function deleteLabel(label: MailLabel) {
    if (!await confirmAction({ title: t('mail.labels.deleteTitle', { name: label.name }), description: t('mail.labels.deleteDescription'), confirmLabel: t('delete'), danger: true })) return
    remove.mutate(label.id)
  }

  return (
    <SettingsCard title={t('mail.labels.title')} description={t('mail.labels.description')} flush>
      <div className="flex flex-col divide-y">
        <SettingsRow>
          <LabelForm submitLabel={t('mail.labels.create')} pending={create.isPending} onSubmit={async (name, color) => { await create.mutateAsync({ name, color }) }} />
        </SettingsRow>
        {create.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{mailProblem(create.error, t('mail.labels.createFailed'))}</SettingsRow> : null}
        {labels.isPending ? <SettingsRow>{t('mail.labels.loading')}</SettingsRow> : null}
        {labels.isError ? <SettingsRow role="alert">{t('mail.labels.loadFailed')}</SettingsRow> : null}
        {labels.isSuccess && sorted.length === 0 ? <SettingsRow className="text-muted-foreground">{t('mail.labels.empty')}</SettingsRow> : null}
        {sorted.map((label) => editingId === label.id
          ? (
              <SettingsRow key={label.id}>
                <LabelForm
                  initial={label}
                  submitLabel={t('mail.save')}
                  pending={update.isPending}
                  onCancel={() => setEditingId(undefined)}
                  onSubmit={async (name, color) => { await update.mutateAsync({ labelId: label.id, name, color }); setEditingId(undefined) }}
                />
              </SettingsRow>
            )
          : (
              <SettingsRow key={label.id}>
                <div className="min-w-0 flex-1"><LabelPill label={label} /></div>
                <Button variant="ghost" type="button" aria-label={t('mail.labels.editAria', { name: label.name })} onClick={() => { update.reset(); setEditingId(label.id) }}>{t('mail.edit')}</Button>
                <Button variant="ghost" type="button" aria-label={t('mail.labels.deleteAria', { name: label.name })} disabled={remove.isPending} onClick={() => void deleteLabel(label)}>{t('delete')}</Button>
              </SettingsRow>
            ))}
        {update.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{mailProblem(update.error, t('mail.labels.saveFailed'))}</SettingsRow> : null}
        {remove.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{mailProblem(remove.error, t('mail.labels.deleteFailed'))}</SettingsRow> : null}
      </div>
    </SettingsCard>
  )
}
