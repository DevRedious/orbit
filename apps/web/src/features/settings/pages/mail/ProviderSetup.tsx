import { useTranslation } from 'react-i18next'
import type { MailProviderSetup } from '@orbit/api/generated/types.gen'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Danger } from 'reicon-react'
import { CopyButton } from './MailDomainRecords'

const SECRET_NAMES = ['signing_secret', 'basic_user', 'basic_password'] as const
const isKnownSecret = (name: string): name is typeof SECRET_NAMES[number] => (SECRET_NAMES as readonly string[]).includes(name)

/** One value to paste at the provider, with a copy button. */
function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-start gap-1 rounded-md border bg-muted/40 px-2 py-1">
        <code className="min-w-0 flex-1 py-0.5 font-mono text-xs break-all">{value}</code>
        <CopyButton text={value} label={label} />
      </div>
    </div>
  )
}

/**
 * What to set up at the provider: the webhook URL, the steps and (Cloudflare) the Email Worker. `generated` holds the
 * secrets Orbit made, which only the create response has.
 */
export function ProviderSetup({ setup, generated }: { setup: MailProviderSetup; generated?: Record<string, string> | null }) {
  const { t } = useTranslation('settings')
  const secrets = Object.entries(generated ?? {})
  return (
    <div className="flex flex-col gap-4">
      {secrets.length > 0 ? (
        <Alert>
          <Danger />
          <AlertTitle>{t('mail.setup.copyNow')}</AlertTitle>
          <AlertDescription>{t('mail.setup.copyNowHint')}</AlertDescription>
        </Alert>
      ) : null}
      <CopyRow label={t('mail.setup.webhookUrl')} value={setup.webhook_url} />
      {secrets.map(([name, value]) => <CopyRow key={name} label={isKnownSecret(name) ? t(`mail.setup.secrets.${name}`) : name} value={value} />)}
      <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[0.8125rem]">
        {setup.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {setup.worker_script ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('mail.setup.workerScript')}</span>
            <CopyButton text={setup.worker_script} label={t('mail.setup.script')} />
          </div>
          <pre className="m-0 max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs">{setup.worker_script}</pre>
        </div>
      ) : null}
    </div>
  )
}
