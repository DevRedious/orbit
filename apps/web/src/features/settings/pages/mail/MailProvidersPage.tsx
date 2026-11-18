import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Add, InfoCircle, Routing } from 'reicon-react'
import type { MailProviderView } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { EmptyState } from '@/components/common/EmptyState'
import { Modal } from '@/components/common/Modal'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDeleteProvider, useUpdateProvider } from '@/features/mail/api/mutations'
import { useMailProviders, type ProviderScope } from '@/features/mail/api/queries'
import { useCan } from '@/features/workspaces/permissions'
import { MailManagersOnly } from './MailDomainsPage'
import { mailProblem, PROVIDER_LABELS, since } from './mailSettingsLib'
import { ProviderForm } from './ProviderForm'
import { ProviderSetup } from './ProviderSetup'

/** Settings → Mail → Providers: the workspace's own providers, and the instance's ones it may use. */
export function MailProvidersPage() {
  const { t } = useTranslation('settings')
  if (!useCan('mail.manage')) return <MailManagersOnly title={t('mail.providers.title')} />
  return <MailProviders scope="workspace" />
}

/**
 * The mail providers of `scope` (Admin → Mail for `instance`): a provider receives a domain's mail and sends it to
 * Orbit over HTTPS. Each own provider shows what to set up at the provider; secrets Orbit makes show once.
 */
export function MailProviders({ scope }: { scope: ProviderScope }) {
  const { t } = useTranslation('settings')
  const providers = useMailProviders(scope)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MailProviderView | null>(null)
  // a provider with secrets that Orbit just made: shown once
  const [shown, setShown] = useState<{ provider: MailProviderView; title: string } | null>(null)
  const canAdd = scope === 'instance' || providers.data?.workspace_providers_enabled === true

  return (
    <>
      {scope === 'workspace' && providers.data && !providers.data.workspace_providers_enabled ? (
        <Alert>
          <InfoCircle />
          <AlertTitle>{t('mail.providers.workspaceOff')}</AlertTitle>
          <AlertDescription>{t('mail.providers.workspaceOffHint')}</AlertDescription>
        </Alert>
      ) : null}
      <SettingsCard
        title={t('mail.providers.title')}
        description={scope === 'instance' ? t('mail.providers.instanceDescription') : t('mail.providers.workspaceDescription')}
        actions={canAdd ? <Button type="button" onClick={() => setAdding(true)}><Add />{t('mail.providers.add')}</Button> : undefined}
        flush
      >
        {providers.isPending ? <p role="status" className="m-0 p-4 text-sm text-muted-foreground">{t('mail.providers.loading')}</p> : null}
        {providers.isError ? (
          <p role="alert" className="m-0 p-4 text-sm text-destructive">
            {mailProblem(providers.error, t('mail.providers.loadFailed'))}{' '}
            <Button variant="ghost" onClick={() => void providers.refetch()}>{t('retry')}</Button>
          </p>
        ) : null}
        {providers.data?.providers.length === 0 ? (
          <EmptyState icon={Routing} title={t('mail.providers.emptyTitle')} description={t('mail.providers.emptyDescription')} />
        ) : null}
        <div className="flex flex-col divide-y">
          {providers.data?.providers.map((provider) => (
            <ProviderRow
              key={provider.id}
              scope={scope}
              provider={provider}
              onEdit={() => setEditing(provider)}
              onNewSecret={(changed) => setShown({ provider: changed, title: t('mail.providers.newSecretFor', { name: changed.name }) })}
            />
          ))}
        </div>
      </SettingsCard>
      {adding ? (
        <ProviderForm scope={scope} onClose={() => setAdding(false)} onCreated={(created) => setShown({ provider: created, title: t('mail.providers.setUp', { name: created.name }) })} />
      ) : null}
      {editing ? <ProviderForm scope={scope} provider={editing} onClose={() => setEditing(null)} /> : null}
      {shown?.provider.setup ? (
        <Modal title={shown.title} description={t('mail.providers.doTheseSteps', { provider: PROVIDER_LABELS[shown.provider.kind] })} onClose={() => setShown(null)}>
          <ProviderSetup setup={shown.provider.setup} generated={shown.provider.generated_secrets} />
        </Modal>
      ) : null}
    </>
  )
}

function ProviderRow({
  scope,
  provider,
  onEdit,
  onNewSecret,
}: {
  scope: ProviderScope
  provider: MailProviderView
  onEdit: () => void
  onNewSecret: (changed: MailProviderView) => void
}) {
  const { t } = useTranslation('settings')
  const remove = useDeleteProvider(scope)
  const update = useUpdateProvider(scope)
  // Orbit makes these secrets, so Orbit can replace them
  const madeByOrbit = provider.kind === 'cloudflare' || provider.kind === 'postmark'
  const [open, setOpen] = useState(false)
  const own = provider.setup !== null && provider.setup !== undefined

  async function removeProvider() {
    const confirmed = await confirmAction({
      title: t('mail.providers.removeTitle', { name: provider.name }),
      description: t('mail.providers.removeDescription'),
      confirmLabel: t('remove'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(provider.id, {
      onSuccess: () => toast(t('mail.providers.removed', { name: provider.name })),
      onError: (error) => toast.error(mailProblem(error, t('mail.providers.removeFailed'))),
    })
  }

  async function newSecret() {
    const confirmed = await confirmAction({
      title: t('mail.providers.newSecretTitle', { name: provider.name }),
      description: provider.kind === 'cloudflare' ? t('mail.providers.newSecretCloudflare') : t('mail.providers.newSecretPostmark'),
      confirmLabel: t('mail.providers.makeNewSecret'),
      danger: true,
    })
    if (!confirmed) return
    update.mutate(
      { providerId: provider.id, body: { regenerate_secrets: true } },
      {
        onSuccess: onNewSecret,
        onError: (error) => toast.error(mailProblem(error, t('mail.providers.newSecretFailed'))),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.8125rem] font-medium text-foreground">{provider.name}</span>
            <Badge variant="outline">{PROVIDER_LABELS[provider.kind]}</Badge>
            {scope === 'workspace' && provider.scope === 'instance' ? <Badge variant="secondary">{t('mail.providers.server')}</Badge> : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {t('mail.providers.domains', { count: provider.domain_count })}
            {provider.last_received_at ? t('mail.providers.lastMessage', { since: since(provider.last_received_at) }) : t('mail.providers.noMessage')}
          </span>
          {provider.last_error ? <span role="status" className="text-xs text-destructive">{t('mail.providers.lastError', { error: provider.last_error })}</span> : null}
        </div>
        {own ? (
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t('mail.providers.hideSetup') : t('mail.providers.setup')}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>{t('mail.providers.change')}</Button>
            {madeByOrbit ? (
              <Button type="button" variant="ghost" size="sm" disabled={update.isPending} onClick={() => void newSecret()}>{t('mail.providers.newSecret')}</Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={remove.isPending} onClick={() => void removeProvider()}>{t('remove')}</Button>
          </div>
        ) : null}
      </div>
      {open && provider.setup ? <ProviderSetup setup={provider.setup} /> : null}
    </div>
  )
}
