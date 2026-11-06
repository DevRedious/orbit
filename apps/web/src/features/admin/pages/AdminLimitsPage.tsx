import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { LimitsView } from '@orbit/api/generated/types.gen'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useInstanceSettings, useSaveLimits } from '@/features/admin/api'
import { FieldGrid } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

/** What one account and one workspace may use. */
export function AdminLimitsPage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('limits.title')}><p role="status">{t('loadingSettings')}</p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('limits.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  // Remount on save so the form shows what the server stored.
  return <LimitsCard key={JSON.stringify(settings.data.limits)} limits={settings.data.limits} />
}

const BYTES_PER_GB = 1_000_000_000

/** A whole number above 0, or `null` (unlimited) for an empty field or 0. `undefined` when it is not a number. */
function parseLimit(value: string, scale = 1): number | null | undefined {
  if (!value.trim()) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return undefined
  return number === 0 ? null : Math.round(number * scale)
}

function LimitsCard({ limits }: { limits: LimitsView }) {
  const { t } = useTranslation('admin')
  const save = useSaveLimits()
  const [workspaces, setWorkspaces] = useState(limits.max_owned_workspaces ? String(limits.max_owned_workspaces) : '')
  const [storage, setStorage] = useState(limits.workspace_storage_quota_bytes ? String(limits.workspace_storage_quota_bytes / BYTES_PER_GB) : '')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const maxOwnedWorkspaces = parseLimit(workspaces)
    const storageQuota = parseLimit(storage, BYTES_PER_GB)
    if (maxOwnedWorkspaces === undefined || storageQuota === undefined) {
      toast.error(i18n.t('admin:limits.invalidNumber'))
      return
    }
    save.mutate({ max_owned_workspaces: maxOwnedWorkspaces, workspace_storage_quota_bytes: storageQuota }, {
      onSuccess: () => toast(i18n.t('admin:limits.saved')),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:limits.saveFailed'))),
    })
  }

  return (
    <form onSubmit={submit}>
      <SettingsCard title={t('limits.title')} description={t('limits.description')}>
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="limit-workspaces">{t('limits.workspaces')}</FieldLabel>
            <Input id="limit-workspaces" type="number" min={0} step={1} placeholder={t('noLimit')} value={workspaces} onChange={(event) => setWorkspaces(event.target.value)} />
            <FieldDescription>{t('limits.workspacesHint')}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="limit-storage">{t('limits.storage')}</FieldLabel>
            <Input id="limit-storage" type="number" min={0} step="any" placeholder={t('noLimit')} value={storage} onChange={(event) => setStorage(event.target.value)} />
            <FieldDescription>{t('limits.storageHint')}</FieldDescription>
          </Field>
        </FieldGrid>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={save.isPending}>{save.isPending ? t('saving') : t('saveLimits')}</Button>
        </div>
      </SettingsCard>
    </form>
  )
}
