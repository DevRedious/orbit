import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { createApiClient } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { Button } from '@/components/ui/button'
import { ApiProblem } from '@orbit/api/problem'
import { currentUserQueryOptions, isTwoFactorChallenge, useLogin, useLoginSecondFactor, useLogout } from '@/features/auth/api'
import { AuthForm, AuthInput } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { useConsumedToken } from '@/features/auth/useConsumedToken'
import { useAcceptInvitation, useInvitationPreview } from '@/features/workspaces/api'

// Anonymous sessions are expected here; do not trigger the global login redirect.
const invitationSessionClient = createApiClient()

export function AcceptInvitationPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const token = useConsumedToken()
  const invitation = useInvitationPreview(token)
  const user = useQuery({ ...currentUserQueryOptions(invitationSessionClient), enabled: !!token, retry: false })
  const accept = useAcceptInvitation()
  const login = useLogin()
  const secondFactor = useLoginSecondFactor()
  const logout = useLogout()
  // Set while an account with two-factor sign-in waits for its code.
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  if (!token) return <AuthMessage title={t('acceptInvitation.unavailableTitle')} detail={t('acceptInvitation.missingToken')} />
  if (invitation.isError) return <AuthMessage title={t('acceptInvitation.unavailableTitle')} detail={t('acceptInvitation.loadFailed')} />
  if (user.isError) return <AuthMessage title={t('acceptInvitation.sessionFailedTitle')} detail={t('acceptInvitation.sessionFailed')} />
  if (!invitation.data || user.isPending) return <AuthMessage title={t('acceptInvitation.loadingTitle')} detail={t('acceptInvitation.loading')} />

  const { email, workspace_name: workspaceName } = invitation.data
  const mismatch = !!user.data && user.data.email.trim().toLowerCase() !== email.trim().toLowerCase()
  const pending = accept.isPending || login.isPending || secondFactor.isPending || logout.isPending
  return (
    <AuthForm
      title={t('acceptInvitation.title', { workspace: workspaceName })}
      error={accept.error || login.error || secondFactor.error || logout.error}
      pending={pending}
      submitLabel={mismatch ? t('acceptInvitation.switchAccount') : !user.data && signIn ? t('acceptInvitation.signInAndAccept') : t('acceptInvitation.accept')}
      onSubmit={async () => {
        if (mismatch) {
          await logout.mutateAsync()
          queryClient.setQueryData(queryKeys.currentUser, null)
          setPassword('')
          setSignIn(true)
          return
        }
        if (!user.data && signIn && twoFactorToken) {
          await secondFactor.mutateAsync({ two_factor_token: twoFactorToken, code }).catch((error: unknown) => {
            // The sign-in expired: start again from the password.
            if (error instanceof ApiProblem && error.code === 'invalid_two_factor_token') setTwoFactorToken(null)
            throw error
          })
        } else if (!user.data && signIn) {
          const response = await login.mutateAsync({ email, password })
          if (isTwoFactorChallenge(response)) {
            setCode('')
            setTwoFactorToken(response.two_factor_token)
            return
          }
        }
        const accepted = await accept.mutateAsync(!user.data && !signIn
          ? { token, email, display_name: displayName, password }
          : { token })
        navigate(`/?workspace=${encodeURIComponent(accepted.workspace_id)}`, { replace: true })
      }}
      actions={!user.data ? <Button variant="outline" size="lg" type="button" disabled={pending} onClick={() => {
        setSignIn((value) => !value)
        setPassword('')
        setTwoFactorToken(null)
        login.reset()
        secondFactor.reset()
        accept.reset()
      }}>{signIn ? t('acceptInvitation.createAccountInstead') : t('acceptInvitation.signInInstead')}</Button> : undefined}
    >
      <AuthInput label={t('fields.email')} type="email" value={email} required={false} />
      {mismatch ? <p className="text-[13px]">{t('acceptInvitation.mismatch', { current: user.data!.email, email })}</p> : (
        <>
          <p className="text-[13px]">{user.data ? t('acceptInvitation.introSignedIn') : signIn ? t('acceptInvitation.introSignIn') : t('acceptInvitation.introCreate')}</p>
          {!user.data && !signIn ? <AuthInput label={t('fields.yourName')} value={displayName} onChange={setDisplayName} /> : null}
          {!user.data && twoFactorToken ? <AuthInput label={t('fields.authenticationCode')} value={code} onChange={setCode} /> : null}
          {!user.data && !twoFactorToken ? <AuthInput label={t('fields.password')} type="password" value={password} onChange={setPassword} /> : null}
        </>
      )}
    </AuthForm>
  )
}
