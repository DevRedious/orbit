import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { CloseCircle, InfoCircle, TickCircle, Warning } from 'reicon-react'
import type { MailAdmin, PtrStatus } from '@orbit/api/generated/types.gen'
import { InfoTip } from '@/components/common/InfoTip'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useSetAdminMail } from '@/features/mail/api/mutations'
import { useAdminMail, useMailProviders } from '@/features/mail/api/queries'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { dateTime, mailProblem } from '@/features/settings/pages/mail/mailSettingsLib'
import { MailTestCard } from '@/features/admin/components/MailTestCard'
import { MailProviders } from '@/features/settings/pages/mail/MailProvidersPage'
import { i18n } from '@/i18n'

type HealthState = 'ok' | 'warning' | 'error' | 'info'

interface HealthItem {
  label: string
  state: HealthState
  detail: ReactNode
  /** What to do about it; shown when the item is not OK. */
  fix?: ReactNode
}

const STATE_ICONS: Record<HealthState, typeof TickCircle> = { ok: TickCircle, warning: Warning, error: CloseCircle, info: InfoCircle }

/** The instance's mail: the Mail switch, the listener's health, and a test message. */
export function AdminMailPage() {
  const { t } = useTranslation('admin')
  const admin = useAdminMail()
  const providers = useMailProviders('instance')
  const hasProviders = (providers.data?.providers.length ?? 0) > 0
  if (admin.isPending) return <SettingsCard title={t('mail.title')}><p role="status">{t('mail.loading')}</p></SettingsCard>
  if (admin.isError) {
    return <SettingsCard title={t('mail.title')}><p role="alert">{mailProblem(admin.error, t('mail.loadFailed'))} <Button variant="ghost" onClick={() => void admin.refetch()}>{t('retry')}</Button></p></SettingsCard>
  }
  return (
    <>
      <DomainsCard admin={admin.data} />
      <MailProviders scope="instance" />
      <HealthCard admin={admin.data} hasProviders={hasProviders} refreshing={admin.isFetching} onRefresh={() => void admin.refetch()} />
      <MailTestCard admin={admin.data} />
    </>
  )
}

function DomainsCard({ admin }: { admin: MailAdmin }) {
  const { t } = useTranslation('admin')
  const save = useSetAdminMail()
  return (
    <SettingsCard title={t('mail.title')} description={t('mail.description')} flush>
      <div className="flex flex-col divide-y">
        <SettingsRow className="flex-nowrap">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.8125rem] font-medium text-foreground">
            {t('mail.enabled')}
            <InfoTip text={t('mail.enabledHint')} />
          </span>
          <Switch
            aria-label={t('mail.title')}
            checked={admin.mail_enabled}
            disabled={save.isPending}
            onCheckedChange={(checked: boolean) => save.mutate({ mail_enabled: checked }, {
              onSuccess: () => toast(checked ? i18n.t('admin:mail.turnedOn') : i18n.t('admin:mail.turnedOff')),
              onError: (error) => toast.error(mailProblem(error, i18n.t('admin:mail.saveFailed'))),
            })}
          />
        </SettingsRow>
        <SettingsRow className="flex-nowrap">
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.8125rem] font-medium text-foreground">
            {t('mail.workspaceProviders')}
            <InfoTip text={t('mail.workspaceProvidersHint')} />
          </span>
          <Switch
            aria-label={t('mail.workspaceProviders')}
            checked={admin.workspace_providers_enabled}
            disabled={save.isPending}
            onCheckedChange={(checked: boolean) => save.mutate({ workspace_providers_enabled: checked }, {
              onSuccess: () => toast(checked ? i18n.t('admin:mail.workspaceProviders') : i18n.t('admin:mail.workspaceProvidersOff')),
              onError: (error) => toast.error(mailProblem(error, i18n.t('admin:mail.saveFailed'))),
            })}
          />
        </SettingsRow>
        <SettingsRow>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
            <span className="font-medium text-foreground">{t('mail.hostname')}</span>
            <span className="text-xs text-muted-foreground"><Trans t={t} i18nKey="mail.hostnameHint" components={{ code: <code className="font-mono" /> }} /></span>
          </div>
          <code className="font-mono text-[0.8125rem]">{admin.hostname ?? t('mail.hostnameNotSet')}</code>
        </SettingsRow>
        <SettingsRow>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
            <span className="font-medium text-foreground">{t('mail.mode')}</span>
            <span className="text-xs text-muted-foreground">
              {admin.mode === 'relay'
                ? t('mail.relayHint')
                : t('mail.directHint')}
            </span>
          </div>
          <Badge variant="outline">{admin.mode === 'relay' ? t('mail.relay') : t('mail.direct')}</Badge>
        </SettingsRow>
      </div>
    </SettingsCard>
  )
}

function ptrItem(ptr: PtrStatus, mailHostname: string | null | undefined): HealthItem {
  // As the template strings showed it before: a missing name reads "null" rather than nothing.
  const hostname = String(mailHostname)
  const label = i18n.t('admin:mail.health.ptr.label')
  const addresses = ptr.addresses
    .map((address) => i18n.t('admin:mail.health.ptr.address', { ip: address.ip, names: address.names.join(', ') || i18n.t('admin:mail.health.ptr.noPtr') }))
    .join('; ')
  switch (ptr.status) {
    case 'ok':
      return { label, state: 'ok', detail: i18n.t('admin:mail.health.ptr.ok', { hostname, addresses }) }
    case 'mismatch':
      return { label, state: 'warning', detail: addresses, fix: i18n.t('admin:mail.health.ptr.mismatchFix', { hostname }) }
    case 'no_address':
      return { label, state: 'error', detail: i18n.t('admin:mail.health.ptr.noAddress', { hostname }), fix: i18n.t('admin:mail.health.ptr.noAddressFix', { hostname }) }
    case 'unknown':
      return { label, state: 'warning', detail: i18n.t('admin:mail.health.ptr.unknown'), fix: i18n.t('admin:mail.health.ptr.unknownFix') }
    case 'no_hostname':
      return { label, state: 'error', detail: i18n.t('admin:mail.health.ptr.noHostname'), fix: i18n.t('admin:mail.health.ptr.noHostnameFix') }
  }
}

function healthItems(admin: MailAdmin, hasProviders: boolean): HealthItem[] {
  if (!admin.enabled && hasProviders) {
    return [{
      label: i18n.t('admin:mail.health.server.label'),
      state: 'info',
      detail: i18n.t('admin:mail.health.server.providers'),
    }]
  }
  if (!admin.enabled) {
    return [{
      label: i18n.t('admin:mail.health.server.label'),
      state: 'info',
      detail: i18n.t('admin:mail.health.server.off'),
      fix: i18n.t('admin:mail.health.server.offFix'),
    }]
  }
  const { listener } = admin
  const items: HealthItem[] = [
    listener.running
      ? { label: i18n.t('admin:mail.health.listener.label'), state: 'ok', detail: i18n.t('admin:mail.health.listener.running', { address: listener.address ?? i18n.t('admin:mail.health.listener.itsPort') }) }
      : { label: i18n.t('admin:mail.health.listener.label'), state: 'error', detail: i18n.t('admin:mail.health.listener.stopped'), fix: i18n.t('admin:mail.health.listener.stoppedFix') },
  ]
  const cert = listener.cert
  const certificate = i18n.t('admin:mail.health.certificate.label')
  const hostname = String(admin.hostname)
  if (!cert) {
    items.push(admin.mode === 'direct'
      ? { label: certificate, state: 'error', detail: i18n.t('admin:mail.health.certificate.missing'), fix: i18n.t('admin:mail.health.certificate.missingFix') }
      : { label: certificate, state: 'info', detail: i18n.t('admin:mail.health.certificate.relay'), fix: i18n.t('admin:mail.health.certificate.relayFix') })
  } else if (!cert.covers_hostname) {
    items.push({ label: certificate, state: 'error', detail: i18n.t('admin:mail.health.certificate.wrongName', { names: cert.names.join(', '), hostname }), fix: i18n.t('admin:mail.health.certificate.wrongNameFix', { hostname }) })
  } else if (cert.expires_soon) {
    items.push({ label: certificate, state: 'warning', detail: i18n.t('admin:mail.health.certificate.expiresSoon', { date: dateTime(cert.expires_at) }), fix: i18n.t('admin:mail.health.certificate.expiresSoonFix') })
  } else {
    items.push({ label: certificate, state: 'ok', detail: i18n.t('admin:mail.health.certificate.ok', { hostname, date: dateTime(cert.expires_at) }) })
  }
  const client = i18n.t('admin:mail.health.client.label')
  if (listener.bridge_peers > 0) {
    items.push({
      label: client,
      state: 'error',
      detail: i18n.t('admin:mail.health.client.bridge', { count: listener.bridge_peers }),
      fix: i18n.t('admin:mail.health.client.bridgeFix'),
    })
  } else if (listener.last_peer_ip) {
    items.push({ label: client, state: 'ok', detail: i18n.t('admin:mail.health.client.last', { ip: listener.last_peer_ip }) })
  } else {
    items.push({ label: client, state: 'info', detail: i18n.t('admin:mail.health.client.none'), fix: i18n.t('admin:mail.health.client.noneFix') })
  }
  items.push(ptrItem(admin.ptr, admin.hostname))
  return items
}

function HealthCard({ admin, hasProviders, refreshing, onRefresh }: { admin: MailAdmin; hasProviders: boolean; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useTranslation('admin')
  const items = healthItems(admin, hasProviders)
  return (
    <SettingsCard
      title={t('mail.health.title')}
      description={t('mail.health.description')}
      actions={<Button type="button" variant="outline" disabled={refreshing} onClick={onRefresh}>{refreshing ? t('mail.health.checking') : t('mail.health.checkAgain')}</Button>}
      flush
    >
      <ul className="m-0 flex list-none flex-col divide-y p-0">
        {items.map((item) => {
          const Icon = STATE_ICONS[item.state]
          return (
            <li key={item.label} data-slot="health-item" data-state={item.state} className="group flex items-start gap-3 px-4 py-3">
              <Icon
                aria-hidden
                className="mt-0.5 size-4.5 shrink-0 text-muted-foreground group-data-[state=error]:text-destructive group-data-[state=ok]:text-emerald-600 group-data-[state=warning]:text-amber-600 dark:group-data-[state=ok]:text-emerald-400 dark:group-data-[state=warning]:text-amber-400"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[0.8125rem]">
                <span className="font-medium text-foreground">
                  {item.label}
                  <span className="sr-only">: {t(`mail.states.${item.state}`)}</span>
                </span>
                <span className="text-xs break-words text-muted-foreground">{item.detail}</span>
                {item.fix && item.state !== 'ok' ? <span className="text-xs text-foreground">{item.fix}</span> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </SettingsCard>
  )
}
