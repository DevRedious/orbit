import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy } from 'reicon-react'
import type { MailAdmin, MailAuthResult, MailTestAddress, MailTestResult } from '@orbit/api/generated/types.gen'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Tip } from '@/components/common/Tip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useCreateTestAddress } from '@/features/mail/api/mutations'
import { useTestAddress } from '@/features/mail/api/queries'
import { copyText, dateTime, mailProblem } from '@/features/settings/pages/mail/mailSettingsLib'
import { timeOfDay } from '@/lib/format'

const RESULT_VARIANTS: Partial<Record<MailAuthResult, 'secondary' | 'destructive'>> = { pass: 'secondary', fail: 'destructive', permerror: 'destructive' }

function AuthBadge({ check, result }: { check: string; result: MailAuthResult }) {
  return <Badge variant={RESULT_VARIANTS[result] ?? 'outline'}>{check}: {result}</Badge>
}

/**
 * **Test message**: a one-time address `check-…@<verified domain>`, valid for an hour. Mail sent to it from outside
 * proves MX, port 25, TLS and the checks; the card asks for the result every 3 s until it arrives or expires.
 */
export function MailTestCard({ admin }: { admin: MailAdmin }) {
  const { t } = useTranslation('admin')
  const create = useCreateTestAddress()
  const [domainId, setDomainId] = useState(admin.test_domains[0]?.id ?? '')
  const [test, setTest] = useState<MailTestAddress | null>(null)
  const result = useTestAddress(test?.id)
  const options = admin.test_domains.map((domain) => ({ value: domain.id, label: domain.name }))
  const chosen = options.some((option) => option.value === domainId) ? domainId : (options[0]?.value ?? '')
  const unavailable = !admin.enabled
    ? t('mail.test.mailOff')
    : options.length === 0
      ? t('mail.test.noDomain')
      : null

  return (
    <SettingsCard
      title={t('mail.test.title')}
      description={t('mail.test.description')}
      flush
    >
      <div className="flex flex-col divide-y">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {unavailable ? <p className="m-0 flex-1 text-[0.8125rem] text-muted-foreground">{unavailable}</p> : (
            <>
              <Select items={options} value={chosen} onValueChange={(value) => setDomainId(value as string)}>
                <SelectTrigger aria-label={t('mail.test.domain')} className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" disabled={!chosen || create.isPending} onClick={() => create.mutate(chosen, { onSuccess: setTest })}>
                {create.isPending ? t('mail.test.making') : test ? t('mail.test.again') : t('mail.test.make')}
              </Button>
              {create.isError ? <p role="alert" className="m-0 text-xs text-destructive">{mailProblem(create.error, t('mail.test.makeFailed'))}</p> : null}
            </>
          )}
        </div>
        {test ? <TestResult test={test} result={result.data} failed={result.isError} /> : null}
      </div>
    </SettingsCard>
  )
}

function TestResult({ test, result, failed }: { test: MailTestAddress; result: MailTestResult | undefined; failed: boolean }) {
  const { t } = useTranslation('admin')
  const status = result?.status ?? 'waiting'
  return (
    <div className="flex flex-col gap-3 px-4 py-3 text-[0.8125rem]" data-slot="test-result" data-status={status}>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono">{test.address}</code>
        <Tip label={t('mail.test.copyAddress')}>
          <Button type="button" variant="ghost" size="icon-xs" aria-label={t('mail.test.copyAddress')} onClick={() => copyText(test.address, t('mail.test.address'))}><Copy /></Button>
        </Tip>
        <span className="text-xs text-muted-foreground">{t('mail.test.validUntil', { time: timeOfDay(test.expires_at) })}</span>
      </div>
      {status === 'waiting' ? (
        <p role="status" className="m-0 flex items-center gap-2 text-muted-foreground">
          {failed ? null : <Spinner role="presentation" aria-hidden aria-label={undefined} className="size-3.5" />}
          {failed ? t('mail.test.readFailed') : t('mail.test.waiting')}
        </p>
      ) : null}
      {status === 'expired' ? <p role="status" className="m-0 text-muted-foreground">{t('mail.test.expired')}</p> : null}
      {status === 'received' && result ? (
        <div role="status" className="flex flex-col gap-2">
          <p className="m-0 font-medium text-emerald-700 dark:text-emerald-400">{result.received_at ? t('mail.test.arrivedAt', { date: dateTime(result.received_at) }) : t('mail.test.arrived')}</p>
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t('mail.test.clientAddress')}</dt>
            <dd className="m-0 font-mono">{result.peer_ip ?? t('mail.test.unknown')}</dd>
            <dt className="text-muted-foreground">HELO</dt>
            <dd className="m-0 font-mono break-all">{result.helo ?? '—'}</dd>
            <dt className="text-muted-foreground">{t('mail.test.sender')}</dt>
            <dd className="m-0 font-mono break-all">{result.mail_from ?? '<>'}</dd>
            <dt className="text-muted-foreground">TLS</dt>
            <dd className="m-0">{result.tls ? `${result.tls.version} (${result.tls.cipher})` : t('mail.test.noTls')}</dd>
          </dl>
          {result.auth ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <AuthBadge check="SPF" result={result.auth.spf} />
              <AuthBadge check="DKIM" result={result.auth.dkim} />
              <AuthBadge check="DMARC" result={result.auth.dmarc} />
              {result.auth.aligned_domain ? <span className="text-xs text-muted-foreground">{t('mail.test.aligned', { domain: result.auth.aligned_domain })}</span> : null}
            </div>
          ) : <p className="m-0 text-xs text-muted-foreground">{t('mail.test.noAuth')}</p>}
        </div>
      ) : null}
    </div>
  )
}
