import { toast } from 'sonner'
import type { MailDnsRecordKind, MailDomain, MailProviderKind, MailProviderView } from '@orbit/api/generated/types.gen'
import { ApiProblem } from '@orbit/api/problem'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import { fullDate, relativeTime, timeOfDay } from '@/lib/format'

/** The server's words for a refused mail request (its `detail` names the reason), else `fallback`. */
export function mailProblem(error: unknown, fallback: string): string {
  return error instanceof ApiProblem ? problemMessage(error, fallback) : i18n.t('settings:noAnswer', { reason: fallback })
}

/** Mail is off for this server (Admin → Inbound mail). */
export const isMailDisabled = (error: unknown) => error instanceof ApiProblem && error.code === 'mail_disabled'

/** Copies `text` and says so; `what` names it in the toast ("Name copied"). */
export function copyText(text: string, what: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast(i18n.t('settings:mail.copiedWhat', { what })),
    () => toast.error(i18n.t('settings:mail.copyFailed')),
  )
}

/** "Fri, Oct 23, 2026, 14:05". */
export const dateTime = (iso: string) => `${fullDate(iso)}, ${timeOfDay(iso)}`

/** "just now", "5m ago", or "on Oct 3" for a week or more. */
export function since(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return i18n.t('settings:mail.since.justNow')
  const ago = relativeTime(iso)
  // `relativeTime` gives a date from a week on
  return diff < 7 * 86_400_000 ? i18n.t('settings:mail.since.ago', { ago }) : i18n.t('settings:mail.since.on', { date: ago })
}

/** In the order the form offers them: the recommended one first. */
export const PROVIDER_LABELS: Record<MailProviderKind, string> = {
  postshiba: 'PostShiba',
  cloudflare: 'Cloudflare Email Routing',
  postmark: 'Postmark',
  mailgun: 'Mailgun',
  resend: 'Resend',
  ses: 'Amazon SES',
}

/** The route value for this server's own SMTP listener. */
export const DIRECT = 'direct'

/** "Directly (MX to this server)", then each provider the workspace may use. */
export function routeOptions(providers: MailProviderView[]) {
  return [
    { value: DIRECT, label: i18n.t('settings:mail.route.direct') },
    ...providers.map((provider) => ({ value: provider.id, label: i18n.t('settings:mail.route.provider', { name: provider.name, kind: PROVIDER_LABELS[provider.kind] }) })),
  ]
}

/** A DNS record's purpose in words ("Mail server"). */
export const kindLabel = (kind: MailDnsRecordKind) => i18n.t(`settings:mail.recordKinds.${kind}`)

/** Mail reaches the workspace only with these; DKIM, SPF and DMARC are for sending (a later release) and reputation. */
export const REQUIRED: ReadonlySet<MailDnsRecordKind> = new Set(['verify', 'mx'])

export interface DomainHealth {
  label: string
  variant: 'secondary' | 'outline' | 'destructive'
  hint: string
}

/** One badge for a domain: its status, and for a verified domain whether its DNS records are all in place. */
export function domainHealth(domain: Pick<MailDomain, 'status' | 'records'>): DomainHealth {
  switch (domain.status) {
    case 'pending':
      return { label: i18n.t('settings:mail.health.pending'), variant: 'outline', hint: i18n.t('settings:mail.health.pendingHint') }
    case 'suspended':
      return { label: i18n.t('settings:mail.health.suspended'), variant: 'destructive', hint: i18n.t('settings:mail.health.suspendedHint') }
    case 'disabled':
      return { label: i18n.t('settings:mail.health.disabled'), variant: 'outline', hint: i18n.t('settings:mail.health.disabledHint') }
    case 'verified': {
      const bad = domain.records.filter((record) => record.status.status === 'missing' || record.status.status === 'wrong')
      const names = (required: boolean) => bad.filter((record) => REQUIRED.has(record.kind) === required).map((record) => kindLabel(record.kind))
      const required = names(true)
      const recommended = names(false)
      if (required.length > 0) return { label: i18n.t('settings:mail.health.actionNeeded'), variant: 'destructive', hint: i18n.t('settings:mail.health.actionNeededHint', { records: required.join(', ') }) }
      if (recommended.length > 0) return { label: i18n.t('settings:mail.health.incomplete'), variant: 'outline', hint: i18n.t('settings:mail.health.incompleteHint', { records: recommended.join(', ') }) }
      return { label: i18n.t('settings:mail.health.healthy'), variant: 'secondary', hint: i18n.t('settings:mail.health.healthyHint') }
    }
  }
}
