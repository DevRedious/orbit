import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useInstanceSettings, useSetRegistration } from '@/features/admin/api'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

/** Instance settings: who can create an account. */
export function AdminSettingsPage() {
  const { t } = useTranslation('admin')
  const settings = useInstanceSettings()
  if (settings.isPending) return <SettingsCard title={t('general.title')}><p role="status">{t('loadingSettings')}</p></SettingsCard>
  if (settings.isError) return <SettingsCard title={t('general.title')}><p role="alert">{t('settingsFailed')} <Button variant="ghost" onClick={() => void settings.refetch()}>{t('retry')}</Button></p></SettingsCard>
  return <RegistrationCard open={settings.data.registration_open} emailReady={settings.data.smtp != null} />
}

function RegistrationCard({ open, emailReady }: { open: boolean; emailReady: boolean }) {
  const { t } = useTranslation('admin')
  const setRegistration = useSetRegistration()
  return (
    <SettingsCard title={t('general.registration.title')} description={t('general.registration.description')} flush>
      <SettingsRow className="flex-nowrap">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
          <span className="font-medium text-foreground">{t('general.registration.open')}</span>
          <span className="text-xs text-muted-foreground">
            {emailReady
              ? t('general.registration.hint')
              : t('general.registration.needsEmail')}
          </span>
        </div>
        <Switch
          aria-label={t('general.registration.open')}
          checked={open}
          disabled={(!emailReady && !open) || setRegistration.isPending}
          onCheckedChange={(checked: boolean) => setRegistration.mutate(checked, {
            onSuccess: () => toast(checked ? i18n.t('admin:general.registration.opened') : i18n.t('admin:general.registration.closed')),
            onError: (error) => toast.error(problemMessage(error, i18n.t('admin:general.registration.failed'))),
          })}
        />
      </SettingsRow>
    </SettingsCard>
  )
}
