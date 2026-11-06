import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { SmtpSecurity, SmtpView } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthOptions, useCurrentUser } from '@/features/auth/api'
import { useInstanceSettings, useRemoveSmtp, useSaveSmtp, useSendTestEmail } from '@/features/admin/api'
import { FieldGrid, RequiredMark } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

// Their labels are `admin:email.security.<value>` keys.
const SECURITY_VALUES: SmtpSecurity[] = ['starttls', 'tls', 'none']
const DEFAULT_PORT: Record<SmtpSecurity, number> = { starttls: 587, tls: 465, none: 25 }

/** The mail server for invitations, sign-up and password reset. */
export function AdminEmailPage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('email.title')}><p role="status">{t('loadingSettings')}</p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('email.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  const smtp = settings.data.smtp ?? null
  // Remount on save so the form shows what the server stored.
  return <EmailCard key={JSON.stringify(smtp)} smtp={smtp} />
}

function EmailCard({ smtp }: { smtp: SmtpView | null }) {
  const { t } = useTranslation('admin')
  const currentUser = useCurrentUser()
  // Orbit Cloud always needs a mail server: it can be replaced, not removed.
  const cloud = useAuthOptions().data?.billing_enabled ?? false
  const save = useSaveSmtp()
  const remove = useRemoveSmtp()
  const test = useSendTestEmail()
  const [draft, setDraft] = useState({
    host: smtp?.host ?? '',
    port: String(smtp?.port ?? DEFAULT_PORT.starttls),
    security: smtp?.security ?? 'starttls' as SmtpSecurity,
    username: smtp?.username ?? '',
    password: '',
    from_address: smtp?.from_address ?? '',
    from_name: smtp?.from_name ?? '',
  })
  // `items` lets Select.Value render the option label instead of the raw value.
  const securityOptions = SECURITY_VALUES.map((value) => ({ value, label: t(`email.security.${value}`) }))
  const set = (field: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [field]: event.target.value }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    save.mutate({
      host: draft.host.trim(),
      port: Number(draft.port),
      security: draft.security,
      username: draft.username.trim() || null,
      // An empty field keeps the saved password.
      password: draft.password || undefined,
      from_address: draft.from_address.trim(),
      from_name: draft.from_name.trim() || null,
    }, {
      onSuccess: () => toast(i18n.t('admin:email.saved')),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:email.saveFailed'))),
    })
  }

  async function removeServer() {
    const confirmed = await confirmAction({
      title: t('email.removeTitle'),
      description: t('email.removeDescription'),
      confirmLabel: t('remove'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(undefined, {
      onSuccess: () => toast(i18n.t('admin:email.removed')),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:email.removeFailed'))),
    })
  }

  return (
    <form onSubmit={submit}>
      <SettingsCard
        title={t('email.title')}
        description={t('email.description')}
        actions={smtp ? (
          <>
            <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate(undefined, {
              onSuccess: () => toast(currentUser.data ? i18n.t('admin:email.testSent', { email: currentUser.data.email }) : i18n.t('admin:email.testSentToYou')),
              onError: (error) => toast.error(problemMessage(error, i18n.t('admin:email.testFailed'))),
            })}>
              {test.isPending ? t('email.sending') : t('email.sendTest')}
            </Button>
            {cloud ? null : <Button type="button" variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => void removeServer()}>{t('remove')}</Button>}
          </>
        ) : undefined}
      >
        <FieldGrid>
          <Field>
            <FieldLabel htmlFor="smtp-host">{t('email.host')} <RequiredMark /></FieldLabel>
            <Input id="smtp-host" required placeholder="smtp.example.com" value={draft.host} onChange={set('host')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-security">{t('email.encryption')}</FieldLabel>
            <Select items={securityOptions} value={draft.security} onValueChange={(value) => {
              const security = value as SmtpSecurity
              setDraft((current) => ({ ...current, security, port: String(DEFAULT_PORT[security]) }))
            }}>
              <SelectTrigger id="smtp-security"><SelectValue /></SelectTrigger>
              <SelectContent>
                {securityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-port">{t('email.port')} <RequiredMark /></FieldLabel>
            <Input id="smtp-port" required type="number" min={1} max={65535} value={draft.port} onChange={set('port')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-username">{t('email.username')}</FieldLabel>
            <Input id="smtp-username" autoComplete="off" value={draft.username} onChange={set('username')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-password">{t('email.password')}</FieldLabel>
            <PasswordInput id="smtp-password" autoComplete="new-password" placeholder={smtp?.password_set ? t('savedSecret') : ''} value={draft.password} onChange={set('password')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-from-address">{t('email.fromAddress')} <RequiredMark /></FieldLabel>
            <Input id="smtp-from-address" required type="email" placeholder="orbit@example.com" value={draft.from_address} onChange={set('from_address')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="smtp-from-name">{t('email.fromName')}</FieldLabel>
            <Input id="smtp-from-name" placeholder="Orbit" value={draft.from_name} onChange={set('from_name')} />
          </Field>
        </FieldGrid>
        <div className="mt-4 flex items-center justify-end gap-3">
          {cloud && smtp ? <p className="mr-auto text-xs text-muted-foreground">{t('email.cloudNeedsServer')}</p> : null}
          <Button type="submit" disabled={save.isPending}>{save.isPending ? t('saving') : t('email.save')}</Button>
        </div>
      </SettingsCard>
    </form>
  )
}
