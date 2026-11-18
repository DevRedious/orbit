import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ChevronRight, Danger, Global, Refresh } from 'reicon-react'
import { cn } from 'cn'
import type { MailDomain, MailMailbox, MailProviderView } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { EmptyState } from '@/components/common/EmptyState'
import { InfoTip } from '@/components/common/InfoTip'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { mailKeys } from '@/features/mail/api/keys'
import { useCheckDomain, useCreateDomain, useDeleteDomain, useSetCatchAll, useSetDomainEnabled } from '@/features/mail/api/mutations'
import { useMailboxes, useMailDomain, useMailDomains, useMailProviders } from '@/features/mail/api/queries'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { shortDate } from '@/lib/format'
import { DomainRouteRow, RouteSelect } from './DomainRoute'
import { MailDomainRecords } from './MailDomainRecords'
import { dateTime, DIRECT, domainHealth, isMailDisabled, mailProblem, since } from './mailSettingsLib'

/** **Check now** reads the domain this often until the check job has run, for at most `CHECK_WAIT_MS`. */
const CHECK_POLL_MS = 2000
const CHECK_WAIT_MS = 30_000
const NO_CATCH_ALL = 'none'

/** Shown to members without `mail.manage`; the server refuses them too. */
export function MailManagersOnly({ title }: { title: string }) {
  const { t } = useTranslation('settings')
  return <SettingsCard title={title}><p className="m-0 text-muted-foreground">{t('mail.managersOnly')}</p></SettingsCard>
}

/** The workspace's mail domains: add one, publish its records, check them, catch-all, turn mail off, remove. */
export function MailDomainsPage() {
  const { t } = useTranslation('settings')
  if (!useCan('mail.manage')) return <MailManagersOnly title={t('mail.domains.title')} />
  return <MailDomains />
}

function MailDomains() {
  const { t } = useTranslation('settings')
  const domains = useMailDomains()
  const mailboxes = useMailboxes()
  const providerList = useMailProviders('workspace')
  const providers = providerList.data?.providers ?? []
  const create = useCreateDomain()
  const [name, setName] = useState('')
  const [route, setRoute] = useState(DIRECT)
  /** The server said the instance switch is off; it stays shown until the page is opened again. */
  const [disabled, setDisabled] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || create.isPending) return
    create.mutate({ name: trimmed, providerId: route === DIRECT ? null : route }, {
      onSuccess: (domain) => { setName(''); toast(t('mail.domains.added', { name: domain.name })) },
      onError: (error) => { if (isMailDisabled(error)) setDisabled(true) },
    })
  }

  return (
    <>
      {disabled ? (
        <Alert>
          <Danger />
          <AlertTitle>{t('mail.domains.mailOff')}</AlertTitle>
          <AlertDescription>{t('mail.domains.mailOffHint')}</AlertDescription>
        </Alert>
      ) : null}
      <SettingsCard title={t('mail.domains.addTitle')} description={t('mail.domains.addDescription')}>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field>
            <FieldLabel htmlFor="mail-domain-name">{t('mail.domains.domain')}</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="mail-domain-name"
                className="max-w-xs"
                placeholder="example.com"
                autoComplete="off"
                value={name}
                disabled={disabled}
                onChange={(event) => { setName(event.target.value); if (create.isError) create.reset() }}
              />
              <Button type="submit" disabled={!name.trim() || create.isPending || disabled}>{create.isPending ? t('mail.domains.adding') : t('mail.domains.add')}</Button>
            </div>
            <FieldDescription>{t('mail.domains.oneWorkspace')}</FieldDescription>
          </Field>
          {providers.length > 0 ? (
            <Field>
              <FieldLabel htmlFor="mail-domain-route">{t('mail.route.title')}</FieldLabel>
              <RouteSelect id="mail-domain-route" label={t('mail.domains.routeAria')} value={route} providers={providers} disabled={disabled} onChange={setRoute} />
              <FieldDescription>{t('mail.domains.routeHint')}</FieldDescription>
            </Field>
          ) : null}
          {create.isError && !disabled ? <p role="alert" className="text-xs text-destructive">{mailProblem(create.error, t('mail.domains.addFailed'))}</p> : null}
        </form>
      </SettingsCard>
      {domains.isPending ? <SettingsCard title={t('mail.domains.listTitle')}><p role="status">{t('mail.domains.loading')}</p></SettingsCard> : null}
      {domains.isError ? (
        <SettingsCard title={t('mail.domains.listTitle')}>
          <p role="alert">{t('mail.domains.loadFailed')} <Button variant="ghost" onClick={() => void domains.refetch()}>{t('retry')}</Button></p>
        </SettingsCard>
      ) : null}
      {domains.data?.length === 0 ? (
        <EmptyState icon={Global} title={t('mail.domains.emptyTitle')} description={t('mail.domains.emptyDescription')} />
      ) : null}
      {domains.data?.map((domain) => <DomainCard key={domain.id} listed={domain} mailboxes={mailboxes.data ?? []} providers={providers} />)}
    </>
  )
}

function DomainCard({ listed, mailboxes, providers }: { listed: MailDomain; mailboxes: MailMailbox[]; providers: MailProviderView[] }) {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const workspaceId = useWorkspace().workspace.id
  const check = useCheckDomain()
  const setCatchAll = useSetCatchAll()
  const setEnabled = useSetDomainEnabled()
  const remove = useDeleteDomain()
  const [open, setOpen] = useState(false)
  /** While a check runs: when it was asked for, the `checked_at` before it and when to stop waiting. */
  const [checking, setChecking] = useState<{ startedAt: number; checkedAt: string | null; until: number } | null>(null)
  // polls until `checked_at` changes or the wait ends; a copy cached by an earlier check does not count
  const detail = useMailDomain(checking ? listed.id : null, (data, updatedAt) =>
    checking && Date.now() < checking.until && !(data && updatedAt > checking.startedAt && data.checked_at !== checking.checkedAt)
      ? CHECK_POLL_MS
      : false,
  )
  const fresh = checking && detail.data && detail.dataUpdatedAt > checking.startedAt ? detail.data : null
  const domain = fresh ?? listed
  const waiting = checking !== null && !(fresh && fresh.checked_at !== checking.checkedAt)

  useEffect(() => {
    if (!checking) return
    if (!waiting) {
      // the card shows the result at once; the list reads it again
      void queryClient.invalidateQueries({ queryKey: mailKeys.domains(workspaceId), exact: true })
      return
    }
    const timer = setTimeout(() => {
      setChecking(null)
      toast(t('mail.domains.dnsNoAnswer'))
    }, Math.max(0, checking.until - Date.now()))
    return () => clearTimeout(timer)
  }, [checking, waiting, queryClient, workspaceId, t])

  function checkNow() {
    check.mutate(domain.id, {
      onSuccess: () => setChecking({ startedAt: Date.now(), checkedAt: domain.checked_at ?? null, until: Date.now() + CHECK_WAIT_MS }),
      onError: (error) => toast.error(mailProblem(error, t('mail.domains.checkFailed'))),
    })
  }

  async function removeDomain() {
    if (domain.address_count > 0) {
      const go = await confirmAction({
        title: t('mail.domains.hasAddressesTitle', { name: domain.name }),
        description: t('mail.domains.hasAddressesDescription', { count: domain.address_count }),
        confirmLabel: t('mail.domains.goToMailboxes'),
      })
      if (go) void navigate('/settings/mail/mailboxes')
      return
    }
    const confirmed = await confirmAction({
      title: t('mail.domains.removeTitle', { name: domain.name }),
      description: t('mail.domains.removeDescription'),
      confirmLabel: t('remove'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(domain.id, {
      onSuccess: () => toast(t('mail.domains.removed', { name: domain.name })),
      onError: (error) => toast.error(mailProblem(error, t('mail.domains.removeFailed'))),
    })
  }

  const health = domainHealth(domain)
  const verify = domain.records.find((record) => record.kind === 'verify')
  const catchAllOptions = [
    { value: NO_CATCH_ALL, label: t('mail.domains.noCatchAll') },
    ...mailboxes.map((mailbox) => ({ value: mailbox.id, label: t('mail.domains.mailboxOption', { name: mailbox.name, address: mailbox.addresses[0]?.address ?? t('mail.domains.noAddress') }) })),
  ]
  const catchAll = domain.catch_all_mailbox_id ?? NO_CATCH_ALL

  return (
    <section className="m-0 flex w-full min-w-0 flex-col rounded-lg bg-card shadow-[0_0_0_1px_var(--border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`mail-domain-${domain.id}`}
        onClick={() => setOpen((value) => !value)}
        className={cn('flex min-h-12 w-full items-center gap-2 py-2 pr-3 pl-3 text-left text-sm font-medium text-foreground hover:bg-muted/40', open ? 'rounded-t-lg' : 'rounded-lg')}
      >
        <ChevronRight aria-hidden className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-[120ms]', open && 'rotate-90')} />
        <span className="min-w-0 flex-1 truncate">{domain.name}</span>
        <Badge variant={health.variant} title={health.hint}>{health.label}</Badge>
      </button>
      {open ? (
        <div id={`mail-domain-${domain.id}`} className="relative min-w-0 overflow-hidden rounded-b-lg border-t bg-background">
          <div className="flex flex-col divide-y">
            <SettingsRow className="flex-nowrap">
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">{statusText(t, domain)}</span>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" disabled={check.isPending || waiting} onClick={checkNow}>
                  <Refresh />
                  {waiting ? t('mail.domains.checking') : t('mail.domains.checkNow')}
                </Button>
                <Button type="button" variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => void removeDomain()}>{t('remove')}</Button>
              </div>
            </SettingsRow>
            {domain.status === 'suspended' ? (
              <div className="p-3">
                <Alert variant="destructive">
                  <Danger />
                  <AlertTitle>{t('mail.domains.verificationGone')}</AlertTitle>
                  <AlertDescription>
                    {verify?.status.status === 'wrong' ? t('mail.domains.txtWrong', { name: verify.name }) : t('mail.domains.txtMissing', { name: verify?.name ?? `_orbit-verify.${domain.name}` })}
                    {domain.grace_ends_at ? t('mail.domains.graceUntil', { domain: domain.name, date: dateTime(domain.grace_ends_at) }) : null}
                    {t('mail.domains.publishAgain')}
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            {providers.length > 0 || domain.provider ? <DomainRouteRow domain={domain} providers={providers} /> : null}
            <SettingsRow className="flex-nowrap">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.8125rem] font-medium text-foreground">
                {t('mail.domains.mailOn')}
                <InfoTip text={t('mail.domains.mailOnHint', { domain: domain.name })} />
              </span>
              <Switch
                aria-label={t('mail.domains.mailOnAria', { domain: domain.name })}
                checked={domain.status !== 'disabled'}
                disabled={setEnabled.isPending}
                onCheckedChange={(enabled: boolean) => setEnabled.mutate({ domainId: domain.id, enabled }, {
                  onError: (error) => toast.error(mailProblem(error, t('mail.domains.changeFailed'))),
                })}
              />
            </SettingsRow>
            <SettingsRow className="flex-nowrap">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.8125rem] font-medium text-foreground">
                {t('mail.domains.catchAll')}
                <InfoTip text={t('mail.domains.catchAllHint', { domain: domain.name })} />
              </span>
              <Select
                items={catchAllOptions}
                value={catchAll}
                disabled={setCatchAll.isPending}
                onValueChange={(value) => setCatchAll.mutate({ domainId: domain.id, mailboxId: value === NO_CATCH_ALL ? null : (value as string) }, {
                  onSuccess: () => toast(t('mail.domains.catchAllSaved')),
                  onError: (error) => toast.error(mailProblem(error, t('mail.domains.catchAllFailed'))),
                })}
              >
                <SelectTrigger aria-label={t('mail.domains.catchAllAria', { domain: domain.name })} className="w-80 max-w-[55vw]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catchAllOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </SettingsRow>
            <div className="px-2 py-1">
              <MailDomainRecords records={domain.records} checked={Boolean(domain.checked_at)} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function statusText(t: TFunction<'settings'>, domain: MailDomain): string {
  const checked = domain.checked_at ? t('mail.domains.lastChecked', { since: since(domain.checked_at) }) : t('mail.domains.notChecked')
  switch (domain.status) {
    case 'pending':
      return t('mail.domains.statusPending', { checked })
    case 'verified':
      return domain.verified_at
        ? t('mail.domains.statusVerifiedSince', { date: shortDate(domain.verified_at), count: domain.address_count, checked })
        : t('mail.domains.statusVerified', { count: domain.address_count, checked })
    case 'suspended':
      return t('mail.domains.statusSuspended', { checked })
    case 'disabled':
      return t('mail.domains.statusDisabled')
  }
}
