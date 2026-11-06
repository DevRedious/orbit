import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { S3Body, S3View } from '@orbit/api/generated/types.gen'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Switch } from '@/components/ui/switch'
import { FieldGrid, RequiredMark } from '@/features/settings/components/SettingsParts'

/** The form of an S3-compatible bucket, for the installation (Admin → Storage) and for one workspace. */
export function S3BucketForm({ s3, title, description, endpointPlaceholder, saving, removing, onSave, onRemove, children }: {
  s3: S3View | null
  title: string
  description: string
  endpointPlaceholder: string
  saving: boolean
  removing: boolean
  onSave: (body: S3Body) => void
  /** Absent: no Remove button. */
  onRemove?: () => void
  /** Status lines under the fields. */
  children?: React.ReactNode
}) {
  const { t } = useTranslation('settings')
  const [draft, setDraft] = useState({
    endpoint: s3?.endpoint ?? '',
    region: s3?.region ?? '',
    bucket: s3?.bucket ?? '',
    prefix: s3?.prefix ?? '',
    access_key_id: s3?.access_key_id ?? '',
    secret_access_key: '',
    path_style: s3?.path_style ?? false,
  })
  const set = (field: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [field]: event.target.value }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onSave({
      endpoint: draft.endpoint.trim(),
      region: draft.region.trim() || null,
      bucket: draft.bucket.trim(),
      prefix: draft.prefix.trim() || null,
      access_key_id: draft.access_key_id.trim(),
      // An empty field keeps the saved secret key.
      secret_access_key: draft.secret_access_key || undefined,
      path_style: draft.path_style,
    })
  }

  return (
    <form onSubmit={submit}>
      <SettingsCard title={title} description={description}>
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="s3-endpoint">{t('s3.endpoint')} <RequiredMark /></FieldLabel>
            <Input id="s3-endpoint" required type="url" placeholder={endpointPlaceholder} value={draft.endpoint} onChange={set('endpoint')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-region">{t('s3.region')}</FieldLabel>
            <Input id="s3-region" placeholder="us-east-1" value={draft.region} onChange={set('region')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-bucket">{t('s3.bucket')} <RequiredMark /></FieldLabel>
            <Input id="s3-bucket" required placeholder="orbit-files" value={draft.bucket} onChange={set('bucket')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-prefix">{t('s3.prefix')}</FieldLabel>
            <Input id="s3-prefix" placeholder="orbit" value={draft.prefix} onChange={set('prefix')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-access-key">{t('s3.accessKey')} <RequiredMark /></FieldLabel>
            <Input id="s3-access-key" required autoComplete="off" value={draft.access_key_id} onChange={set('access_key_id')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-secret-key">{t('s3.secretKey')} {s3 ? null : <RequiredMark />}</FieldLabel>
            <PasswordInput id="s3-secret-key" autoComplete="new-password" required={!s3} placeholder={s3 ? t('s3.secretSaved') : ''} value={draft.secret_access_key} onChange={set('secret_access_key')} />
          </Field>
        </FieldGrid>
        {children}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={draft.path_style} onCheckedChange={(checked: boolean) => setDraft((current) => ({ ...current, path_style: checked }))} />
            {t('s3.pathStyle')}
          </label>
          <div className="flex items-center gap-2">
            {onRemove ? <Button type="button" variant="ghost" className="text-destructive" disabled={removing} onClick={onRemove}>{t('s3.remove')}</Button> : null}
            <Button type="submit" disabled={saving}>{saving ? t('s3.testing') : t('s3.save')}</Button>
          </div>
        </div>
      </SettingsCard>
    </form>
  )
}
