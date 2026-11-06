import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useAuthOptions, useCompleteRecovery, useRequestRecovery } from '@/features/auth/api'
import { acceptedDetail, recoveryRequestCopy } from '@/features/auth/authState'
import { AuthForm, AuthInput } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { useConsumedToken } from '@/features/auth/useConsumedToken'

export function RecoveryPage() {
  const token = useConsumedToken()
  const options = useAuthOptions()
  if (token) return <CompleteRecovery token={token} />
  // Without a mail server, only an administrator can create a recovery link.
  return options.data?.email_enabled ? <RequestRecovery /> : <AuthMessage {...recoveryRequestCopy()} />
}

function RequestRecovery() {
  const { t } = useTranslation('auth')
  const mutation = useRequestRecovery()
  const [email, setEmail] = useState('')
  if (mutation.isSuccess) return <AuthMessage title={t('checkEmail')} detail={acceptedDetail(mutation.data.detail)} />
  return (
    <AuthForm title={t('recovery.resetTitle')} error={mutation.error} pending={mutation.isPending} submitLabel={t('recovery.sendLink')} onSubmit={() => mutation.mutateAsync({ email: email.trim() })} footer={<Link to="/login">{t('backToSignIn')}</Link>}>
      <AuthInput label={t('fields.email')} type="email" value={email} onChange={setEmail} />
    </AuthForm>
  )
}

function CompleteRecovery({ token }: { token: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const mutation = useCompleteRecovery()
  const [password, setPassword] = useState('')
  return (
    <AuthForm title={t('recovery.title')} error={mutation.error} pending={mutation.isPending} submitLabel={t('recovery.submit')} onSubmit={async () => {
      await mutation.mutateAsync({ token, password })
      navigate('/login', { replace: true })
    }}>
      <AuthInput label={t('fields.newPassword')} type="password" value={password} onChange={setPassword} />
    </AuthForm>
  )
}
