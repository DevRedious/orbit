import { useTranslation } from 'react-i18next'
import { ProviderMark } from '@/components/common/icons/ProviderMark'
import { Button } from '@/components/ui/button'
import { useConnectedAccounts, useStartProviderSignIn } from '@/features/auth/api'
import { PROVIDER_NAMES } from '@/features/auth/providerSignIn'
import { problemMessage } from '@/i18n/problem'

/**
 * Answers 401 `reauthentication_required` for an account without a password: a fresh sign-in with its connected
 * provider, which comes back to `returnTo`. The person then tries the change again.
 */
export function ConfirmWithProvider({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation('auth')
  const accounts = useConnectedAccounts()
  const start = useStartProviderSignIn()
  const provider = accounts.data?.[0]?.provider
  if (!provider) return <p role="alert" className="text-[13px] text-destructive">{t('confirmWithProvider.signInAgain')}</p>
  const name = PROVIDER_NAMES[provider]
  return (
    <div role="alert" className="grid gap-3 text-[13px]">
      <p>{t('confirmWithProvider.intro', { provider: name })}</p>
      {start.isError ? <p className="text-destructive">{problemMessage(start.error, t('confirmWithProvider.startFailed'))}</p> : null}
      <Button type="button" variant="outline" className="justify-self-start" disabled={start.isPending || start.isSuccess} onClick={() => start.mutate({ provider, intent: 'confirm', returnTo })}>
        <ProviderMark provider={provider} />
        {t('confirmWithProvider.confirm', { provider: name })}
      </Button>
    </div>
  )
}
