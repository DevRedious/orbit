import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { AccessPicker, ProjectPicker, type ScopeResource } from '@/components/common/ScopeAccess'
import { AuthBrand, AuthCard } from '@/features/auth/components/AuthForm'
import { currentUserQueryOptions } from '@/features/auth/api'
import { createApiClient } from '@/api/client'
import { oauthRequest, type OAuthConsent } from '@/features/auth/oauth'
import { loginPath } from '@/features/auth/returnTo'

// Anonymous consent sessions must not trigger the app-wide /login redirect.
const consentClient = createApiClient()

type Scope = 'tasks:write' | 'docs:read' | 'docs:write' | 'chat:read'

// Task read access comes with every grant, and chat has no write scope. Names and hints are `auth:oauthConsent.resources` keys.
const RESOURCES: (Omit<ScopeResource<Scope>, 'name' | 'hint'> & { id: 'tasks' | 'docs' | 'chat' })[] = [
  { id: 'tasks', write: 'tasks:write' },
  { id: 'docs', read: 'docs:read', write: 'docs:write' },
  { id: 'chat', read: 'chat:read' },
]

export function OAuthConsentPage() {
  const { t } = useTranslation('auth')
  const [params] = useSearchParams()
  const request = params.get('request') ?? ''
  const user = useQuery(currentUserQueryOptions(consentClient))
  const [remote, setRemote] = useState(false)
  const [callback, setCallback] = useState<{ url: string; approved: boolean } | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [workspace, setWorkspace] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [allProjects, setAllProjects] = useState(false)
  const [scopes, setScopes] = useState<Scope[]>([])
  const consent = useQuery({
    queryKey: ['oauth-consent', request, user.data?.id],
    queryFn: () => oauthRequest<OAuthConsent>(`/api/v1/oauth/consent/${encodeURIComponent(request)}`),
    enabled: Boolean(user.data) && /^[A-Za-z0-9_-]{43}$/.test(request),
    retry: false,
    refetchOnWindowFocus: false,
  })
  const approve = useMutation({
    mutationFn: async (approved: boolean) => {
      const result = await oauthRequest<{ redirect_uri: string }>(`/api/v1/oauth/consent/${encodeURIComponent(request)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf_token: consent.data?.csrf_token, approved, workspace_id: workspace || null, project_ids: allProjects ? [] : selected, all_projects: allProjects, scopes }),
      })
      if (remote) setCallback({ url: result.redirect_uri, approved })
      else window.location.assign(result.redirect_uri)
    },
  })
  async function copyCallback() {
    if (!callback) return
    try {
      await navigator.clipboard.writeText(callback.url)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }
  if (callback) return <AuthCard><div className="grid gap-5">
    <AuthBrand />
    <h1 className="text-xl font-semibold">{callback.approved ? t('oauthConsent.completeTitle') : t('oauthConsent.deniedTitle')}</h1>
    <p className="text-sm text-muted-foreground">{t('oauthConsent.pasteCallback')}</p>
    {callback.approved ? <p className="text-sm text-muted-foreground">{t('oauthConsent.codeExpires')}</p> : null}
    <Label htmlFor="callback-url">{t('oauthConsent.callbackUrl')}</Label>
    <textarea id="callback-url" readOnly value={callback.url} rows={4} className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs break-all" onFocus={(event) => event.currentTarget.select()} />
    <Button onClick={() => void copyCallback()}>{t('oauthConsent.copyCallback')}</Button>
    <p role="status" className="text-sm text-muted-foreground">{copyState === 'copied' ? t('oauthConsent.copied') : copyState === 'failed' ? t('oauthConsent.copyFailed') : t('oauthConsent.keepOpen')}</p>
  </div></AuthCard>
  if (user.isPending) return <LoadingScreen />
  if (user.data === null) return <Navigate to={loginPath(`/oauth/consent?request=${request}`)} replace />
  const workspaceProjects = consent.data?.projects.filter((project) => project.workspace_id === workspace) ?? []
  const workspaces = [...new Map(consent.data?.projects.map((project) => [project.workspace_id, project.workspace_name])).entries()]
  return <AuthCard><div className="grid gap-5">
    <AuthBrand />
    <h1 className="text-xl font-semibold">{t('oauthConsent.title')}</h1>
    {user.isError || consent.isError || !/^[A-Za-z0-9_-]{43}$/.test(request) ? <p role="alert">{t('oauthConsent.unavailable')}</p> : consent.data ? <>
      <p><Trans t={t} i18nKey="oauthConsent.wantsToConnect" values={{ client: consent.data.client_name }} components={{ strong: <strong /> }} /></p>
      <p className="text-sm text-muted-foreground">{t('oauthConsent.signedInAs', { name: user.data?.display_name })}</p>
      <Label>{t('oauthConsent.workspace')}<Select value={workspace} onValueChange={(value) => { setWorkspace(value ?? ''); setSelected([]) }}>
        <SelectTrigger><SelectValue placeholder={t('oauthConsent.selectWorkspace')}>{workspaces.find(([id]) => id === workspace)?.[1] ?? t('oauthConsent.selectWorkspace')}</SelectValue></SelectTrigger>
        <SelectContent>{workspaces.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
      </Select></Label>
      <AccessPicker id="consent-access" resources={RESOURCES.map(({ id, ...resource }) => ({ ...resource, name: t(`oauthConsent.resources.${id}.name`), hint: t(`oauthConsent.resources.${id}.hint`), details: id === 'tasks' ? <ProjectPicker id="consent-projects" projects={workspaceProjects} selected={selected} onChange={setSelected} all={allProjects} onAllChange={setAllProjects} empty={workspaces.length ? undefined : t('oauthConsent.noProjects')} /> : undefined }))} scopes={scopes} onChange={setScopes} />
      <div className="grid gap-2">
        <Label className="flex items-center gap-2">
          <Checkbox checked={remote} disabled={approve.isPending} onCheckedChange={(checked) => setRemote(Boolean(checked))} />
          {t('oauthConsent.remote')}
        </Label>
        <p className="text-xs text-muted-foreground">{t('oauthConsent.remoteHint')}</p>
      </div>
      {approve.isError ? <p role="alert" className="text-sm text-destructive">{approve.error.message}</p> : null}
      <div className="flex gap-3">
        <Button variant="outline" disabled={approve.isPending} onClick={() => approve.mutate(false)}>{t('oauthConsent.deny')}</Button>
        <Button disabled={!workspace || (!allProjects && (!selected.length || selected.length > 100)) || approve.isPending} onClick={() => approve.mutate(true)}>{scopes.length ? t('oauthConsent.allowSelected') : t('oauthConsent.allowRead')}</Button>
      </div>
      <p className="text-xs text-muted-foreground"><Trans t={t} i18nKey="oauthConsent.redirect" values={{ url: consent.data.redirect_to }} components={{ strong: <strong className="break-words font-medium text-foreground" /> }} /></p>
    </> : <p>{t('oauthConsent.loading')}</p>}
  </div></AuthCard>
}
