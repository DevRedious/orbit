import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { InfoTip } from '@/components/common/InfoTip'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useInstanceSettings, useSetRegistration } from '@/features/admin/api'
import { SetByEnvironment } from '@/features/admin/components/SetByEnvironment'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { LoadingText } from '@/components/ui/spinner'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

/** Instance settings: who can create an account. */
export function AdminSettingsPage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('general.title')}><p><LoadingText>{t('loadingSettings')}</LoadingText></p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('general.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  return <RegistrationCard open={settings.data.registration_open} ready={settings.data.registration_ready} locked={settings.data.environment.registration_open} />
}

function RegistrationCard({ open, ready, locked }: { open: boolean; ready: boolean; locked: boolean }) {
  const { t } = useTranslation('admin')
  const setRegistration = useSetRegistration()
  return (
    <SettingsCard title={t('general.registration.title')} description={t('general.registration.description')} flush>
      <SettingsRow className="flex-nowrap">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
          {ready
            ? <span className="inline-flex items-center gap-1.5 font-medium text-foreground">{t('general.registration.open')} <InfoTip text={t('general.registration.hint')} /></span>
            : <span className="font-medium text-foreground">{t('general.registration.open')}</span>}
          {ready ? null : <span className="text-xs text-muted-foreground">{t('general.registration.needsEmail')}</span>}
          {locked ? <SetByEnvironment variable="ORBIT_OPEN_REGISTRATION" /> : null}
        </div>
        <Switch
          aria-label={t('general.registration.open')}
          checked={open}
          disabled={locked || (!ready && !open) || setRegistration.isPending}
          onCheckedChange={(checked: boolean) => setRegistration.mutate(checked, {
            onSuccess: () => toast(checked ? i18n.t('admin:general.registration.opened') : i18n.t('admin:general.registration.closed')),
            onError: (error) => toast.error(problemMessage(error, i18n.t('admin:general.registration.failed'))),
          })}
        />
      </SettingsRow>
    </SettingsCard>
  )
}
