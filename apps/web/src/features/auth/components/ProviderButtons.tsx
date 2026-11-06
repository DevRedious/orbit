import type { Provider } from '@orbit/api/generated/types.gen'
import { useTranslation } from 'react-i18next'
import { ProviderMark } from '@/components/common/icons/ProviderMark'
import { Button } from '@/components/ui/button'
import { useStartProviderSignIn } from '@/features/auth/api'
import { PROVIDER_NAMES } from '@/features/auth/providerSignIn'
import { problemMessage } from '@/i18n/problem'

/** "Continue with Google / GitHub" for the providers an admin configured. Signs in, or signs up where that is open. */
export function ProviderButtons({ providers, returnTo = null, disabled = false }: { providers: Provider[]; returnTo?: string | null; disabled?: boolean }) {
  const { t } = useTranslation('auth')
  const start = useStartProviderSignIn()
  if (providers.length === 0) return null
  return (
    <>
      {providers.map((provider) => (
        // Stays disabled after success: the page is leaving for the provider.
        <Button key={provider} type="button" variant="outline" size="lg" disabled={disabled || start.isPending || start.isSuccess} onClick={() => start.mutate({ provider, intent: 'sign_in', returnTo })}>
          <ProviderMark provider={provider} />
          {t('providers.continueWith', { provider: PROVIDER_NAMES[provider] })}
        </Button>
      ))}
      {start.isError ? <p role="alert" className="text-[13px] text-destructive">{problemMessage(start.error, t('providers.startFailed'))}</p> : null}
    </>
  )
}
