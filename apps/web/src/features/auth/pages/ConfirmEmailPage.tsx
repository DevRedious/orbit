import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ApiProblem } from '@orbit/api/problem'
import { useConfirmEmailChange } from '@/features/auth/api'
import { AuthCard } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { useConsumedToken } from '@/features/auth/useConsumedToken'
import { problemMessage } from '@/i18n/problem'

const ERROR_TITLES = {
  invalid_email_change_token: 'confirmEmail.invalidTitle',
  email_taken: 'confirmEmail.takenTitle',
} as const

const errorTitle = (code: string) => (Object.hasOwn(ERROR_TITLES, code) ? ERROR_TITLES[code as keyof typeof ERROR_TITLES] : null)

/**
 * `/confirm-email?token=…`: the link that an email change sends to the new address. Opens with or without a session,
 * since the person may read the email on another device.
 */
export function ConfirmEmailPage() {
  const { t } = useTranslation('auth')
  const token = useConsumedToken()
  const confirm = useConfirmEmailChange()
  const started = useRef(false)

  useEffect(() => {
    // The token works once.
    if (started.current || !token) return
    started.current = true
    confirm.mutate(token)
  }, [confirm, token])

  if (!token) return <AuthMessage title={t('confirmEmail.invalidTitle')} detail={t('confirmEmail.missingToken')} />
  if (confirm.isSuccess) {
    return (
      <AuthCard>
        <h1 className="mb-1 text-xl font-semibold">{t('confirmEmail.changedTitle')}</h1>
        <p className="text-[13px] leading-[1.6] text-muted-foreground">{t('confirmEmail.changedDetail', { email: confirm.data })}</p>
        <p className="mt-4 text-[13px]"><Link to="/" className="font-medium text-foreground">{t('confirmEmail.continue')}</Link></p>
      </AuthCard>
    )
  }
  if (confirm.isError) {
    const titleKey = confirm.error instanceof ApiProblem ? errorTitle(confirm.error.code) : null
    return (
      <AuthCard>
        <h1 className="mb-1 text-xl font-semibold">{titleKey ? t(titleKey) : t('confirmEmail.notChangedTitle')}</h1>
        <p role="alert" className="text-[13px] leading-[1.6] text-muted-foreground">{problemMessage(confirm.error, t('confirmEmail.failed'))}</p>
        <p className="mt-4 text-[13px]"><Link to="/profile" className="font-medium text-foreground">{t('confirmEmail.goToSettings')}</Link></p>
      </AuthCard>
    )
  }
  return <AuthMessage title={t('confirmEmail.changingTitle')} detail={t('oneMoment')} />
}
