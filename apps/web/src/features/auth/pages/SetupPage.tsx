import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useCompleteSetup } from '@/features/auth/api'
import { AuthForm, AuthInput } from '@/features/auth/components/AuthForm'
import { AuthMessage } from '@/features/auth/components/AuthMessage'
import { useConsumedToken } from '@/features/auth/useConsumedToken'

export function SetupPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const setup = useCompleteSetup()
  const token = useConsumedToken()
  const [form, setForm] = useState({ display_name: '', email: '', password: '' })
  if (!token) return <AuthMessage title={t('setup.messageTitle')} detail={t('setup.openLink')} />
  return (
    <AuthForm title={t('setup.title')} error={setup.error} pending={setup.isPending} submitLabel={t('setup.submit')} onSubmit={async () => {
      await setup.mutateAsync({ token, ...form })
      navigate('/onboarding', { replace: true })
    }}>
      <div role="note" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-[13px] text-muted-foreground">
        <p><Trans t={t} i18nKey="setup.rootNote" components={{ strong: <strong className="font-semibold text-foreground" /> }} /></p>
        <p className="mt-1.5">{t('setup.passwordNote')}</p>
      </div>
      <AuthInput label={t('fields.yourName')} value={form.display_name} onChange={(display_name) => setForm({ ...form, display_name })} />
      <AuthInput label={t('fields.email')} type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
      <AuthInput label={t('fields.password')} type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
    </AuthForm>
  )
}
