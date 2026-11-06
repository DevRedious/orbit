import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useAuthOptions, useCompleteRegistration, useRequestRegistration } from '@/features/auth/api'
import { acceptedDetail } from '@/features/auth/authState'
import { AuthCard, AuthForm, AuthInput } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { ProviderButtons } from '@/features/auth/components/ProviderButtons'
import { useConsumedToken } from '@/features/auth/useConsumedToken'

/** Open registration: first the email (a link goes there), then from that link the name and password. */
export function RegisterPage() {
  const token = useConsumedToken()
  return token ? <CompleteRegistration token={token} /> : <RequestRegistration />
}

function RequestRegistration() {
  const { t } = useTranslation('auth')
  const options = useAuthOptions()
  const mutation = useRequestRegistration()
  const [email, setEmail] = useState('')
  if (mutation.isSuccess) return <AuthMessage title={t('checkEmail')} detail={t('register.sentDetail', { detail: acceptedDetail(mutation.data.detail) })} />
  // A provider can create the account without a mail server, so email sign-up may be off while providers are on.
  const providers = options.data?.provider_registration_open ? options.data.providers : []
  if (options.data && !options.data.registration_open && providers.length === 0) {
    return <AuthMessage title={t('register.closedTitle')} detail={t('register.closedDetail')} />
  }
  if (options.data && !options.data.registration_open) {
    return (
      <AuthCard className="grid gap-4">
        <h1 className="text-xl font-semibold">{t('register.title')}</h1>
        <div className="grid gap-3"><ProviderButtons providers={providers} /></div>
        <p className="text-center text-[13px] text-muted-foreground"><Link to="/login">{t('alreadyHaveAccount')}</Link></p>
      </AuthCard>
    )
  }
  return (
    <AuthForm title={t('register.title')} error={mutation.error} pending={mutation.isPending} submitLabel={t('register.sendLink')} onSubmit={() => mutation.mutateAsync({ email: email.trim() })} actions={<ProviderButtons providers={providers} disabled={mutation.isPending} />} footer={<Link to="/login">{t('alreadyHaveAccount')}</Link>}>
      <AuthInput label={t('fields.email')} type="email" value={email} onChange={setEmail} />
    </AuthForm>
  )
}

function CompleteRegistration({ token }: { token: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const mutation = useCompleteRegistration()
  const [form, setForm] = useState({ display_name: '', password: '' })
  return (
    <AuthForm title={t('register.completeTitle')} error={mutation.error} pending={mutation.isPending} submitLabel={t('register.submit')} onSubmit={async () => {
      await mutation.mutateAsync({ token, ...form })
      navigate('/onboarding', { replace: true })
    }}>
      <AuthInput label={t('fields.yourName')} value={form.display_name} onChange={(display_name) => setForm({ ...form, display_name })} />
      <AuthInput label={t('fields.password')} type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
    </AuthForm>
  )
}
