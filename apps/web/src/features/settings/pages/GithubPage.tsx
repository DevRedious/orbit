import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/components/common/SettingsCard'
import { useStartGithubManifest, useGithubWorkspaceSettings } from '@/features/tasks/api/github'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { loadFailed } from '@/lib/connection'
import { problemMessage } from '@/i18n/problem'

export function GithubPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const query = useGithubWorkspaceSettings(workspace.id)
  const register = useStartGithubManifest(workspace.id)
  const resetRegistration = register.reset
  const [organization, setOrganization] = useState('')

  useEffect(() => {
    const clearOldError = () => resetRegistration()
    window.addEventListener('pageshow', clearOldError)
    return () => window.removeEventListener('pageshow', clearOldError)
  }, [resetRegistration])

  const beginRegistration = async () => {
    let data
    try { data = await register.mutateAsync(organization.trim()) } catch { return }
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = data.action
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'manifest'
    input.value = JSON.stringify(data.manifest)
    form.append(input)
    document.body.append(form)
    form.submit()
  }

  if (loadFailed(query)) return <SettingsCard title="GitHub">{t('github.unavailable')}</SettingsCard>
  if (query.data === undefined) return <SettingsCard title="GitHub">{t('github.loading')}</SettingsCard>
  const settings = query.data

  return <SettingsCard title="GitHub" description={t('github.description')}>
    {!settings.app_slug ? (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">{t('github.registerIntro')}</p>
        {settings.can_manage ? <>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="github-organization">{t('github.organization')}</Label>
            <Input id="github-organization" value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={t('github.organizationPlaceholder')} />
          </div>
          {!settings.key_configured ? <p role="alert" className="text-xs text-destructive">{t('github.notReady')}</p> : null}
          <Button disabled={!settings.key_configured || register.isPending} onClick={() => void beginRegistration()}>{t('github.register')}</Button>
          {register.isError ? <p role="alert" className="text-xs text-destructive">{problemMessage(register.error, register.error instanceof Error ? register.error.message : t('github.registerFailed'))}</p> : null}
        </> : <p className="text-sm text-muted-foreground">{t('github.askAdmin')}</p>}
      </div>
    ) : <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-foreground">{t('github.app', { slug: settings.app_slug })}</p>
      {settings.can_manage && settings.install_url ? <Button variant="outline" onClick={() => window.location.assign(settings.install_url!)}>{t('github.install')}</Button> : null}
      <div className="w-full">
        <p className="mb-2 text-sm font-medium">{t('github.installedRepositories')}</p>
        {settings.repositories.length > 0 ? (
          <ul aria-label={t('github.installedRepositories')} className="grid gap-2">
            {settings.repositories.map((item) => <li key={`${item.installation_id}:${item.repository}`} className="rounded-md border px-3 py-2 text-sm">{item.repository}</li>)}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{t('github.noRepositories')}</p>}
      </div>
      <p className="text-sm text-muted-foreground">{t('github.afterInstall')}</p>
    </div>}
  </SettingsCard>
}
