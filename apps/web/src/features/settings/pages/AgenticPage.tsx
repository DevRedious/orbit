import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { mcpClientCommands, mcpUrl } from '@orbit/api/mcp'
import { SettingsCard } from '@/components/common/SettingsCard'
import { CopyCodeButton } from '@/components/common/CopyCodeButton'
import { OAuthConnections } from '@/features/auth/components/OAuthConnections'

/** Account view: connect AI clients to Orbit's scoped MCP server, and see the connected ones. */
export function AgenticPage() {
  const { t } = useTranslation('settings')
  const url = mcpUrl(window.location.origin)
  return (
    <>
      <SettingsCard title={t('agentic.serverTitle')} description={t('agentic.serverDescription')}>
        <CodeBlock text={url} />
      </SettingsCard>
      <SettingsCard title={t('agentic.connectTitle')} description={t('agentic.connectDescription')}>
        <div className="flex flex-col gap-4">
          {mcpClientCommands(url).map((entry) => (
            <div key={entry.client} className="flex flex-col gap-1.5">
              <p className="text-[13px] font-medium text-foreground">{entry.client}</p>
              <CodeBlock text={entry.command} />
              <p className="text-xs text-muted-foreground">{entry.signIn}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{t('agentic.remote')}</p>
          <p className="text-xs text-muted-foreground">
            <Trans t={t} i18nKey="agentic.apiToken" components={{ link: <Link to="/settings/api-tokens" className="text-foreground underline underline-offset-2" /> }} />
          </p>
        </div>
      </SettingsCard>
      <OAuthConnections />
    </>
  )
}

function CodeBlock({ text }: { text: string }) {
  return (
    <div className="group relative rounded-md bg-muted/50 py-2.5 pr-20 pl-3">
      <pre className="font-mono text-xs leading-5 break-all whitespace-pre-wrap text-foreground">{text}</pre>
      <CopyCodeButton getText={() => text} className="absolute top-1.5 right-1.5" />
    </div>
  )
}
