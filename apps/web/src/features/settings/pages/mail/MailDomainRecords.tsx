import { Copy } from 'reicon-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { MailDnsRecord } from '@orbit/api/generated/types.gen'
import { Tip } from '@/components/common/Tip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { copyText, kindLabel, REQUIRED } from './mailSettingsLib'

/** The badge of a record from the last check: OK, or what is missing and how much it matters. */
function recordBadge(t: TFunction<'settings'>, record: MailDnsRecord, checked: boolean): { label: string; variant: 'secondary' | 'destructive' | 'outline'; hint: string } {
  const required = REQUIRED.has(record.kind)
  switch (record.status.status) {
    case 'ok':
      return { label: t('mail.records.badges.ok'), variant: 'secondary', hint: t('mail.records.badges.okHint') }
    case 'unknown':
      return checked
        ? { label: t('mail.records.badges.unknown'), variant: 'outline', hint: t('mail.records.badges.unknownHint') }
        : { label: t('mail.records.badges.notChecked'), variant: 'outline', hint: t('mail.records.badges.notCheckedHint') }
    case 'missing':
      return required
        ? { label: t('mail.records.badges.required'), variant: 'destructive', hint: t('mail.records.badges.missingRequiredHint') }
        : { label: t('mail.records.badges.recommended'), variant: 'outline', hint: t('mail.records.badges.missingRecommendedHint') }
    case 'wrong':
      return required
        ? { label: t('mail.records.badges.required'), variant: 'destructive', hint: t('mail.records.badges.wrongRequiredHint') }
        : { label: t('mail.records.badges.warning'), variant: 'outline', hint: t('mail.records.badges.wrongRecommendedHint') }
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation('settings')
  const copyLabel = t('mail.copyWhat', { what: label.toLowerCase() })
  return (
    <Tip label={copyLabel}>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={copyLabel} onClick={() => copyText(text, label)}>
        <Copy />
      </Button>
    </Tip>
  )
}

/** The records to publish for a domain, each with copy buttons and its status at the last check (`checked`). */
export function MailDomainRecords({ records, checked }: { records: MailDnsRecord[]; checked: boolean }) {
  const { t } = useTranslation('settings')
  return (
    <Table aria-label={t('mail.records.aria')}>
      <TableHeader>
        <TableRow>
          <TableHead>{t('mail.records.type')}</TableHead>
          <TableHead>{t('mail.records.name')}</TableHead>
          <TableHead>{t('mail.records.value')}</TableHead>
          <TableHead>{t('mail.records.status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const badge = recordBadge(t, record, checked)
          const found = record.status.status === 'wrong' ? record.status.found : null
          return (
            <TableRow key={`${record.kind}:${record.value}`}>
              <TableCell className="align-top">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{record.type}</span>
                  <span className="text-xs text-muted-foreground">{kindLabel(record.kind)}</span>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex items-start gap-1">
                  <code className="min-w-0 py-0.5 font-mono text-xs break-all whitespace-normal">{record.name}</code>
                  <CopyButton text={record.name} label={t('mail.records.name')} />
                </div>
              </TableCell>
              <TableCell className="max-w-md align-top">
                <div className="flex items-start gap-1">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <code className="py-0.5 font-mono text-xs break-all whitespace-normal">{record.value}</code>
                    {record.priority != null ? <span className="text-xs text-muted-foreground">{t('mail.records.priority', { priority: record.priority })}</span> : null}
                    {record.txt_strings.length > 1 ? (
                      <div className="flex flex-col gap-0.5 text-xs whitespace-normal text-muted-foreground">
                        <span>{t('mail.records.txtSplit', { strings: record.txt_strings.length })}</span>
                        <code className="font-mono break-all">{record.txt_strings.map((part) => `"${part}"`).join(' ')}</code>
                      </div>
                    ) : null}
                  </div>
                  <CopyButton text={record.value} label={t('mail.records.value')} />
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex max-w-56 flex-col items-start gap-1 whitespace-normal">
                  <Badge variant={badge.variant} title={badge.hint}>{badge.label}</Badge>
                  {found !== null ? <span className="text-xs break-all text-muted-foreground">{t('mail.records.found')} <code className="font-mono">{found || t('mail.records.empty')}</code></span> : null}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
