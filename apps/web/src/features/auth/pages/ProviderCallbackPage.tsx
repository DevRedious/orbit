import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ApiProblem } from '@orbit/api/problem'
import { useProviderExchange } from '@/features/auth/api'
import { AuthCard } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { LinkPasswordStep } from '@/features/auth/components/LinkPasswordStep'
import { TwoFactorStep } from '@/features/auth/components/TwoFactorStep'
import { loginDestination } from '@/features/auth/returnTo'
import { clearProviderFlow, parseProviderCallback, PROVIDER_NAMES, storedProviderFlow } from '@/features/auth/providerSignIn'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import en from '@orbit/i18n/locales/en/auth'

/** Where a `connect` or `confirm` goes back to: the account page that started it. */
function settingsDestination(returnTo: string | null) {
  return returnTo === '/profile' || returnTo?.startsWith('/profile/') ? returnTo : '/profile/security'
}

type TitledCode = keyof typeof en.callback.problemTitles

/** The problem title in the UI language when Orbit knows its code and English wording, else as the server sent it. */
function problemTitle(problem: ApiProblem): string {
  const { code } = problem
  if (!Object.hasOwn(en.callback.problemTitles, code)) return problem.problem.title
  const key = `auth:callback.problemTitles.${code as TitledCode}` as const
  return i18n.t(key, { lng: 'en' }) === problem.problem.title ? i18n.t(key) : problem.problem.title
}

/**
 * `/login/callback#handoff=…`: the server's redirect back from Google or GitHub. Trades the handoff and this tab's
 * verifier for a session (or a code step), or finishes a `connect` / `confirm` for the signed-in account.
 */
export function ProviderCallbackPage() {
  const { t } = useTranslation('auth')
  const location = useLocation()
  const navigate = useNavigate()
  const exchange = useProviderExchange()
  const [callback] = useState(() => ({ ...parseProviderCallback(location.hash), flow: storedProviderFlow() }))
  const [codeStepError, setCodeStepError] = useState<Error | null>(null)
  // The password step of a first link can lead to a code step of its own.
  const [linkTwoFactorToken, setLinkTwoFactorToken] = useState<string | null>(null)
  const started = useRef(false)
  const { handoff, returnTo, flow } = callback

  useEffect(() => {
    if (started.current) return
    started.current = true
    // The handoff is single-use, but it still should not stay in the history.
    void navigate(location.pathname, { replace: true })
    clearProviderFlow()
    if (!handoff || !flow) return
    exchange.mutate({ handoff, code_verifier: flow.verifier }, {
      onSuccess: (result) => {
        if (result.kind === 'signed_in') void navigate(loginDestination(returnTo), { replace: true })
        if (result.kind === 'done') {
          toast(flow.intent === 'connect' ? i18n.t('auth:callback.connected', { provider: PROVIDER_NAMES[flow.provider] }) : i18n.t('auth:callback.confirmed', { provider: PROVIDER_NAMES[flow.provider] }))
          void navigate(settingsDestination(returnTo), { replace: true })
        }
      },
    })
  }, [exchange, flow, handoff, location.pathname, navigate, returnTo])

  const signingIn = !flow || flow.intent === 'sign_in'
  const error = codeStepError ?? exchange.error
  if (error || !handoff || !flow) {
    const problem = error instanceof ApiProblem ? error : null
    return (
      <AuthCard>
        <h1 className="mb-1 text-xl font-semibold">{problem ? problemTitle(problem) : t('callback.expiredTitle')}</h1>
        <p role="alert" className="text-[13px] leading-[1.6] text-muted-foreground">{error ? problemMessage(error, t('callback.failed')) : t('callback.expired')}</p>
        <p className="mt-4 text-[13px]">
          {signingIn
            ? <Link to="/login" className="font-medium text-foreground">{t('backToSignIn')}</Link>
            : <Link to={settingsDestination(returnTo)} className="font-medium text-foreground">{t('callback.backToSettings')}</Link>}
        </p>
      </AuthCard>
    )
  }
  const signedIn = () => void navigate(loginDestination(returnTo), { replace: true })
  const back = (reason: Error | null) => {
    if (reason) setCodeStepError(reason)
    else void navigate('/login', { replace: true })
  }
  const twoFactorToken = exchange.data?.kind === 'two_factor' ? exchange.data.token : linkTwoFactorToken
  if (twoFactorToken) return <TwoFactorStep token={twoFactorToken} onSignedIn={signedIn} onBack={back} />
  if (exchange.data?.kind === 'password') {
    return <LinkPasswordStep token={exchange.data.token} provider={exchange.data.provider} email={exchange.data.email} onSignedIn={signedIn} onTwoFactor={setLinkTwoFactorToken} onBack={back} />
  }
  return <AuthMessage title={signingIn ? t('callback.signingIn') : t('callback.confirming')} detail={t('oneMoment')} />
}
