import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { SmsTracking } from 'reicon-react'
import type { MailFailedReceipt, MailRejectedDelivery, MailRejectReason } from '@orbit/api/generated/types.gen'
import { EmptyState } from '@/components/common/EmptyState'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRetryReceipt } from '@/features/mail/api/mutations'
import { useFailedReceipts } from '@/features/mail/api/queries'
import { useCan } from '@/features/workspaces/permissions'
import { formatSize } from '@/lib/attachmentLib'
import { MailManagersOnly } from './MailDomainsPage'
import { dateTime, mailProblem } from './mailSettingsLib'

/**
 * Messages Orbit accepted but could not file into their mailboxes (`failed`), or that have waited for over an hour
 * without a job (`stuck`). The raw message is kept; **Retry** files it again.
 */
export function FailedMailPage() {
  const { t } = useTranslation('settings')
  if (!useCan('mail.manage')) return <MailManagersOnly title={t('mail.failed.title')} />
  return <FailedMail />
}

function FailedMail() {
  const { t } = useTranslation('settings')
  const receipts = useFailedReceipts()
  if (receipts.isPending) return <SettingsCard title={t('mail.failed.title')}><p role="status">{t('mail.failed.loading')}</p></SettingsCard>
  if (receipts.isError) {
    return (
      <SettingsCard title={t('mail.failed.title')}>
        <p role="alert">{mailProblem(receipts.error, t('mail.failed.loadFailed'))} <Button variant="ghost" onClick={() => void receipts.refetch()}>{t('retry')}</Button></p>
      </SettingsCard>
    )
  }
  const { count: total, receipts: rows, rejected } = receipts.data
  if (total === 0 && rejected.length === 0) {
    return <EmptyState icon={SmsTracking} title={t('mail.failed.emptyTitle')} description={t('mail.failed.emptyDescription')} />
  }
  const shown = rows.length < total ? t('mail.failed.newestShown', { count: rows.length }) : ''
  return (
    <>
      {total > 0 ? <FailedReceipts total={total} rows={rows} shown={shown} /> : null}
      {rejected.length > 0 ? <NotDelivered rejected={rejected} /> : null}
    </>
  )
}

/**
 * Mail a provider accepted that Orbit could not deliver, so the sender got no bounce. No body was kept; add an alias
 * or a catch-all for an address that should exist. Kept for 30 days.
 */
function NotDelivered({ rejected }: { rejected: MailRejectedDelivery[] }) {
  const { t } = useTranslation('settings')
  const reasonText = (reason: MailRejectReason) => t(`mail.failed.reasons.${reason}`)
  return (
    <SettingsCard
      title={t('mail.failed.notDeliveredTitle')}
      description={t('mail.failed.notDeliveredDescription')}
      flush
    >
      <div className="px-2 py-1">
        <Table aria-label={t('mail.failed.notDeliveredAria')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('mail.failed.received')}</TableHead>
              <TableHead>{t('mail.failed.sender')}</TableHead>
              <TableHead>{t('mail.failed.recipient')}</TableHead>
              <TableHead>{t('mail.failed.reasonColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rejected.map((entry) => (
              <TableRow key={`${entry.received_at}:${entry.recipient}`}>
                <TableCell className="align-top">{dateTime(entry.received_at)}</TableCell>
                <TableCell className="max-w-56 truncate align-top" title={entry.mail_from ?? undefined}>{entry.mail_from ?? t('mail.failed.nullSender')}</TableCell>
                <TableCell className="max-w-56 truncate align-top" title={entry.recipient}>{entry.recipient}</TableCell>
                <TableCell className="max-w-sm align-top whitespace-normal">
                  <span className="text-xs text-muted-foreground">{t('mail.failed.reason', { reason: reasonText(entry.reason), provider: entry.provider_name })}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsCard>
  )
}

function FailedReceipts({ total, rows, shown }: { total: number; rows: MailFailedReceipt[]; shown: string }) {
  const { t } = useTranslation('settings')
  return (
    <SettingsCard
      title={t('mail.failed.title')}
      description={t('mail.failed.description', { count: total, shown })}
      flush
    >
      <div className="px-2 py-1">
        <Table aria-label={t('mail.failed.title')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('mail.failed.received')}</TableHead>
              <TableHead>{t('mail.failed.sender')}</TableHead>
              <TableHead>{t('mail.failed.size')}</TableHead>
              <TableHead>{t('mail.failed.error')}</TableHead>
              <TableHead>{t('mail.failed.status')}</TableHead>
              <TableHead><span className="sr-only">{t('mail.failed.actions')}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((receipt) => <ReceiptRow key={receipt.id} receipt={receipt} />)}
          </TableBody>
        </Table>
      </div>
    </SettingsCard>
  )
}

function ReceiptRow({ receipt }: { receipt: MailFailedReceipt }) {
  const { t } = useTranslation('settings')
  const retry = useRetryReceipt()
  const sender = receipt.mail_from ?? t('mail.failed.nullSender')
  return (
    <TableRow>
      <TableCell className="align-top">{dateTime(receipt.received_at)}</TableCell>
      <TableCell className="max-w-56 truncate align-top" title={sender}>{sender}</TableCell>
      <TableCell className="align-top">{formatSize(receipt.size)}</TableCell>
      <TableCell className="max-w-sm align-top whitespace-normal">
        <span className="text-xs break-words text-muted-foreground">
          {receipt.error ?? (receipt.status === 'stuck' ? t('mail.failed.stuckHint') : t('mail.failed.noError'))}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-start gap-0.5">
          <Badge variant={receipt.status === 'failed' ? 'destructive' : 'outline'}>{receipt.status === 'failed' ? t('mail.failed.failedBadge') : t('mail.failed.stuckBadge')}</Badge>
          <span className="text-xs text-muted-foreground">{t('mail.failed.attempts', { count: receipt.attempts })}</span>
        </div>
      </TableCell>
      <TableCell className="text-right align-top">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('mail.failed.retryAria', { sender })}
          disabled={retry.isPending}
          onClick={() => retry.mutate(receipt.id, {
            onSuccess: () => toast(t('mail.failed.retried')),
            onError: (error) => toast.error(mailProblem(error, t('mail.failed.retryFailed'))),
          })}
        >
          {retry.isPending ? t('mail.failed.retrying') : t('retry')}
        </Button>
      </TableCell>
    </TableRow>
  )
}
