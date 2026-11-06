import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Copy } from 'reicon-react'
import type { Provider, SignInProviderView } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useInstanceSettings, useRemoveSignInProvider, useSaveSignInProvider } from '@/features/admin/api'
import { PROVIDER_NAMES } from '@/features/auth/providerSignIn'
import { FieldGrid, RequiredMark } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

// The setup steps of each provider are `admin:signInProviders.<provider>` keys.
const PROVIDERS: Provider[] = ['google', 'github']

/** "Continue with Google / GitHub" on the sign-in page: the client each provider issued to this Orbit. */
export function AdminSignInProvidersPage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('signInProviders.title')}><p role="status">{t('loadingSettings')}</p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('signInProviders.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  return (
    <>
      {PROVIDERS.map((provider) => {
        const saved = settings.data.sign_in_providers.find((item) => item.provider === provider) ?? null
        // Remount on save so the form shows what the server stored.
        return <ProviderCard key={`${provider}:${JSON.stringify(saved)}`} provider={provider} description={t(`signInProviders.${provider}`)} saved={saved} />
      })}
    </>
  )
}

function ProviderCard({ provider, description, saved }: { provider: Provider; description: string; saved: SignInProviderView | null }) {
  const { t } = useTranslation('admin')
  const save = useSaveSignInProvider()
  const remove = useRemoveSignInProvider()
  const [clientId, setClientId] = useState(saved?.client_id ?? '')
  const [secret, setSecret] = useState('')
  const id = useId()
  const name = PROVIDER_NAMES[provider]
  // The server reports the callback URL of saved providers only; before the first save it is this origin's.
  const callbackUrl = saved?.callback_url ?? `${window.location.origin}/api/v1/auth/providers/${provider}/callback`

  async function removeProvider() {
    const confirmed = await confirmAction({
      title: t('signInProviders.removeTitle', { name }),
      description: t('signInProviders.removeDescription', { name }),
      confirmLabel: t('remove'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(provider, {
      onSuccess: () => toast(i18n.t('admin:signInProviders.removed', { name })),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:signInProviders.removeFailed', { name }))),
    })
  }

  return (
    <form onSubmit={(event) => {
      event.preventDefault()
      save.mutate({ provider, body: { client_id: clientId.trim(), client_secret: secret || null } }, {
        onSuccess: () => toast(i18n.t('admin:signInProviders.saved', { name })),
        onError: (error) => toast.error(problemMessage(error, i18n.t('admin:signInProviders.saveFailed', { name }))),
      })
    }}>
      <SettingsCard title={name} description={description}>
        <FieldGrid>
          <Field className="min-[900px]:col-span-2">
            <FieldLabel htmlFor={`${id}-callback`}>{t('signInProviders.callbackUrl')}</FieldLabel>
            <div className="flex items-center gap-2">
              <Input id={`${id}-callback`} readOnly value={callbackUrl} className="font-mono" onFocus={(event) => event.target.select()} />
              <Button type="button" variant="outline" size="icon" aria-label={t('signInProviders.copyCallback')} onClick={() => {
                void navigator.clipboard.writeText(callbackUrl).then(() => toast(i18n.t('admin:copied')), () => toast.error(i18n.t('admin:copyFailed')))
              }}>
                <Copy />
              </Button>
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-client-id`}>{t('signInProviders.clientId')} <RequiredMark /></FieldLabel>
            <Input id={`${id}-client-id`} required autoComplete="off" spellCheck={false} value={clientId} onChange={(event) => setClientId(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-secret`}>{t('signInProviders.clientSecret')} {saved?.secret_set ? null : <RequiredMark />}</FieldLabel>
            <PasswordInput id={`${id}-secret`} autoComplete="new-password" required={!saved?.secret_set} placeholder={saved?.secret_set ? t('savedSecret') : ''} value={secret} onChange={(event) => setSecret(event.target.value)} />
            <FieldDescription>{t('signInProviders.storedEncrypted')}</FieldDescription>
          </Field>
        </FieldGrid>
        <div className="mt-4 flex items-center justify-end gap-2">
          {saved ? <Button type="button" variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => void removeProvider()}>{t('remove')}</Button> : null}
          <Button type="submit" disabled={save.isPending}>{save.isPending ? t('saving') : t('signInProviders.save', { name })}</Button>
        </div>
      </SettingsCard>
    </form>
  )
}
