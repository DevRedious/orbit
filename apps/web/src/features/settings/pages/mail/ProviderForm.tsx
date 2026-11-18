import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import type { MailProviderKind, MailProviderSecretsBody, MailProviderSettings, MailProviderView } from '@orbit/api/generated/types.gen'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateProvider, useUpdateProvider } from '@/features/mail/api/mutations'
import type { ProviderScope } from '@/features/mail/api/queries'
import { mailProblem, PROVIDER_LABELS } from './mailSettingsLib'

const RECOMMENDED: MailProviderKind = 'postshiba'
const KINDS = Object.keys(PROVIDER_LABELS) as MailProviderKind[]

const MAILGUN_REGIONS = [
  { value: 'us', label: 'US' },
  { value: 'eu', label: 'EU' },
]

type SettingsKey = ParseKeys<'settings'>

/** The secrets each kind needs from its provider; Orbit makes Cloudflare's and Postmark's. `hint` is a key, or literal when `literalHint`. */
const SECRET_FIELDS: Record<MailProviderKind, { name: keyof MailProviderSecretsBody; label: SettingsKey; hint?: SettingsKey; literalHint?: string }[]> = {
  postshiba: [
    { name: 'api_key', label: 'mail.providerForm.secrets.apiKey', hint: 'mail.providerForm.secrets.postshibaApiKeyHint' },
    { name: 'webhook_secret', label: 'mail.providerForm.secrets.inboxSigningSecret', hint: 'mail.providerForm.secrets.inboxSigningSecretHint' },
  ],
  cloudflare: [],
  postmark: [],
  mailgun: [{ name: 'signing_key', label: 'mail.providerForm.secrets.mailgunSigningKey' }],
  resend: [
    { name: 'api_key', label: 'mail.providerForm.secrets.apiKey', hint: 'mail.providerForm.secrets.resendApiKeyHint' },
    { name: 'webhook_secret', label: 'mail.providerForm.secrets.webhookSigningSecret', literalHint: 'whsec_…' },
  ],
  ses: [
    { name: 'access_key_id', label: 'mail.providerForm.secrets.accessKeyId', hint: 'mail.providerForm.secrets.accessKeyIdHint' },
    { name: 'secret_access_key', label: 'mail.providerForm.secrets.secretAccessKey' },
  ],
}

const hostsText = (hosts: string[]) => hosts.join(', ')
const hostsList = (text: string) => text.split(/[\s,]+/).map((host) => host.trim()).filter(Boolean)

/** Add a provider (kind, name, its secrets and settings), or change one: secrets left empty stay as they are. */
export function ProviderForm({
  scope,
  provider,
  onClose,
  onCreated,
}: {
  scope: ProviderScope
  provider?: MailProviderView
  onClose: () => void
  onCreated?: (created: MailProviderView) => void
}) {
  const { t } = useTranslation('settings')
  const ids = useId()
  const kindOptions = KINDS.map((option) => ({
    value: option,
    label: option === RECOMMENDED ? t('mail.providerForm.recommended', { name: PROVIDER_LABELS[option] }) : PROVIDER_LABELS[option],
  }))
  const create = useCreateProvider(scope)
  const update = useUpdateProvider(scope)
  const [kind, setKind] = useState<MailProviderKind>(provider?.kind ?? RECOMMENDED)
  const [name, setName] = useState(provider?.name ?? '')
  const [secrets, setSecrets] = useState<MailProviderSecretsBody>({})
  const [settings, setSettings] = useState<MailProviderSettings>(provider?.settings ?? { mx_hosts: [] })
  const [mx, setMx] = useState(hostsText(provider?.settings.mx_hosts ?? []))
  const saving = create.isPending || update.isPending
  const error = create.error ?? update.error
  const fields = SECRET_FIELDS[kind]
  const secretsGiven = fields.every((field) => (secrets[field.name] ?? '').trim() !== '')
  const secretsTouched = fields.some((field) => (secrets[field.name] ?? '').trim() !== '')
  const setting = (key: 'region' | 'bucket' | 'prefix' | 'topic_arn', value: string) =>
    setSettings((current) => ({ ...current, [key]: value.trim() === '' ? null : value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const body = { name: name.trim() || PROVIDER_LABELS[kind], settings: { ...settings, mx_hosts: hostsList(mx) } }
    if (provider) {
      update.mutate(
        { providerId: provider.id, body: { ...body, secrets: secretsTouched ? secrets : null } },
        { onSuccess: onClose },
      )
      return
    }
    create.mutate(
      { kind, ...body, secrets: fields.length > 0 ? secrets : null },
      { onSuccess: (created) => { onCreated?.(created); onClose() } },
    )
  }

  const ready = provider ? !secretsTouched || secretsGiven : secretsGiven
  return (
    <Modal
      title={provider ? t('mail.providerForm.changeTitle', { name: provider.name }) : t('mail.providerForm.addTitle')}
      description={t('mail.providerForm.description')}
      onClose={onClose}
      dismissible={!saving}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${ids}-kind`}>{t('mail.providerForm.provider')}</FieldLabel>
            <Select items={kindOptions} value={kind} disabled={Boolean(provider)} onValueChange={(value) => { setKind(value as MailProviderKind); setSecrets({}) }}>
              <SelectTrigger id={`${ids}-kind`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {kindOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${ids}-name`}>{t('mail.providerForm.name')}</FieldLabel>
            <Input id={`${ids}-name`} autoComplete="off" placeholder={PROVIDER_LABELS[kind]} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
        </div>
        {fields.length === 0 && !provider ? (
          <p className="m-0 text-[0.8125rem] text-muted-foreground">{t('mail.providerForm.orbitMakesSecret')}</p>
        ) : null}
        {fields.map((field) => (
          <Field key={field.name}>
            <FieldLabel htmlFor={`${ids}-${field.name}`}>{t(field.label)}</FieldLabel>
            <Input
              id={`${ids}-${field.name}`}
              type="password"
              autoComplete="off"
              placeholder={provider?.secrets_set.includes(field.name) ? t('mail.providerForm.secretSet') : undefined}
              value={secrets[field.name] ?? ''}
              onChange={(event) => setSecrets((current) => ({ ...current, [field.name]: event.target.value }))}
            />
            {field.hint || field.literalHint ? <FieldDescription>{field.hint ? t(field.hint) : field.literalHint}</FieldDescription> : null}
          </Field>
        ))}
        {kind === 'mailgun' ? (
          <Field>
            <FieldLabel htmlFor={`${ids}-region`}>{t('mail.providerForm.region')}</FieldLabel>
            <Select items={MAILGUN_REGIONS} value={settings.region === 'eu' ? 'eu' : 'us'} onValueChange={(value) => setting('region', value === 'eu' ? 'eu' : '')}>
              <SelectTrigger id={`${ids}-region`} className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAILGUN_REGIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {kind === 'ses' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${ids}-ses-region`}>{t('mail.providerForm.awsRegion')}</FieldLabel>
              <Input id={`${ids}-ses-region`} autoComplete="off" placeholder="us-east-1" value={settings.region ?? ''} onChange={(event) => setting('region', event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${ids}-bucket`}>{t('mail.providerForm.bucket')}</FieldLabel>
              <Input id={`${ids}-bucket`} autoComplete="off" value={settings.bucket ?? ''} onChange={(event) => setting('bucket', event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${ids}-prefix`}>{t('mail.providerForm.prefix')}</FieldLabel>
              <Input id={`${ids}-prefix`} autoComplete="off" placeholder={t('mail.providerForm.optional')} value={settings.prefix ?? ''} onChange={(event) => setting('prefix', event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${ids}-topic`}>{t('mail.providerForm.topic')}</FieldLabel>
              <Input id={`${ids}-topic`} autoComplete="off" placeholder="arn:aws:sns:…" value={settings.topic_arn ?? ''} onChange={(event) => setting('topic_arn', event.target.value)} />
            </Field>
          </div>
        ) : null}
        <Field>
          <FieldLabel htmlFor={`${ids}-mx`}>{t('mail.providerForm.mxHosts')}</FieldLabel>
          <Input id={`${ids}-mx`} autoComplete="off" placeholder={kind === 'resend' ? t('mail.providerForm.mxResend') : t('mail.providerForm.mxDefault')} value={mx} onChange={(event) => setMx(event.target.value)} />
          <FieldDescription>{t('mail.providerForm.mxHint')}</FieldDescription>
        </Field>
        {error ? <p role="alert" className="text-sm text-destructive">{mailProblem(error, t('mail.providerForm.saveFailed'))}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
          <Button type="submit" disabled={saving || !ready}>{saving ? t('mail.saving') : provider ? t('mail.save') : t('mail.providers.add')}</Button>
        </DialogFooter>
      </form>
    </Modal>
  )
}
