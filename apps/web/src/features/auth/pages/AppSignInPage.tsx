import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { ApiProblem } from '@orbit/api/problem'
import { cn } from 'cn'
import { buttonVariants } from '@/components/ui/button'
import { useAppPasskeySignIn } from '@/features/auth/api'
import { AuthCard, AuthForm } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { isPasskeyCancel, passkeysSupported } from '@/features/auth/passkey'

/**
 * `/login/app#flow=…`: the Orbit app opens this page in the system browser to sign in with a passkey, because a passkey
 * belongs to this server's web origin. The passkey is always asked for, and only after a click: a browser that is
 * already signed in does not finish the flow by itself. Nobody is signed in here. The page ends at the app's redirect
 * with a one-time handoff, which only the app that started the flow can trade for a session.
 */
export function AppSignInPage() {
  const { t } = useTranslation('auth')
  const location = useLocation()
  const navigate = useNavigate()
  const [flow] = useState(() => new URLSearchParams(location.hash.slice(1)).get('flow'))
  const signIn = useAppPasskeySignIn()
  const redirectUrl = signIn.data

  useEffect(() => {
    // The flow token should not stay in the address or the history.
    if (location.hash) void navigate(location.pathname, { replace: true })
  }, [location.hash, location.pathname, navigate])

  useEffect(() => {
    if (redirectUrl) window.location.assign(redirectUrl)
  }, [redirectUrl])

  const expired = signIn.error instanceof ApiProblem && signIn.error.code === 'invalid_app_sign_in'
  if (!flow || expired) return <AuthMessage title={t('appSignIn.expiredTitle')} detail={t('appSignIn.expired')} />
  if (!passkeysSupported()) return <AuthMessage title={t('appSignIn.unsupportedTitle')} detail={t('appSignIn.unsupported')} />
  if (redirectUrl) {
    return (
      <AuthCard>
        <h1 className="mb-1 text-xl font-semibold">{t('appSignIn.doneTitle')}</h1>
        <p className="text-[0.8125rem] leading-[1.6] text-muted-foreground">{t('appSignIn.done')}</p>
        {/* a link, not a script: a browser can refuse a redirect to an app that no click started */}
        <a href={redirectUrl} className={cn(buttonVariants({ size: 'lg' }), 'mt-4 w-full')}>{t('appSignIn.openApp')}</a>
      </AuthCard>
    )
  }
  return (
    <AuthForm
      title={t('appSignIn.title')}
      description={t('appSignIn.description')}
      error={signIn.error && !isPasskeyCancel(signIn.error) ? signIn.error : null}
      pending={signIn.isPending}
      submitLabel={t('appSignIn.submit')}
      onSubmit={() => signIn.mutateAsync(flow)}
    >
      {null}
    </AuthForm>
  )
}
