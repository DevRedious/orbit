import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trans, useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { InfoTip } from '@/components/common/InfoTip'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { AccessPicker, ProjectPicker, type ScopeResource } from '@/components/common/ScopeAccess'
import { AuthBrand, AuthCard } from '@/features/auth/components/AuthForm'
import { currentUserQueryOptions } from '@/features/auth/api'
import { createApiClient } from '@/api/client'
import { oauthRequest, type OAuthConsent } from '@/features/auth/oauth'
import { loginPath } from '@/features/auth/returnTo'
import { LoadingText } from '@/components/ui/spinner'

// Anonymous consent sessions must not trigger the app-wide /login redirect.
const consentClient = createApiClient()

// What the connection may use in one workspace: all projects, or the selected ones.
type Pick = { selected: string[]; all: boolean }
const NO_PICK: Pick = { selected: [], all: false }

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
  // A workspace is in the connection when it has an entry here.
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [scopes, setScopes] = useState<Scope[]>([])
  const consent = useQuery({
    queryKey: ['oauth-consent', request, user.data?.id],
    queryFn: () => oauthRequest<OAuthConsent>(`/api/v1/oauth/consent/${encodeURIComponent(request)}`),
    enabled: Boolean(user.data) && /^[A-Za-z0-9_-]{43}$/.test(request),
    retry: false,
    refetchOnWindowFocus: false,
  })
  const workspaces = consent.data?.workspaces ?? []
  // A single workspace needs no picker.
  const chosen = workspaces.length === 1 ? workspaces : workspaces.filter(({ id }) => id in picks)
  const pickOf = (id: string) => picks[id] ?? NO_PICK
  const setPick = (id: string, change: Partial<Pick>) => setPicks((current) => ({ ...current, [id]: { ...(current[id] ?? NO_PICK), ...change } }))
  const toggleWorkspace = (id: string, on: boolean) => setPicks((current) => {
    const { [id]: _removed, ...rest } = current
    return on ? { ...rest, [id]: NO_PICK } : rest
  })
  const approve = useMutation({
    mutationFn: async (approved: boolean) => {
      const result = await oauthRequest<{ redirect_uri: string }>(`/api/v1/oauth/consent/${encodeURIComponent(request)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf_token: consent.data?.csrf_token, approved, workspaces: approved ? chosen.map(({ id }) => ({ workspace_id: id, project_ids: pickOf(id).all ? [] : pickOf(id).selected, all_projects: pickOf(id).all })) : [], scopes }),
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
  const complete = chosen.length > 0 && chosen.every(({ id }) => pickOf(id).all || (pickOf(id).selected.length > 0 && pickOf(id).selected.length <= 100))
  return <AuthCard><div className="grid gap-5">
    <AuthBrand />
    <h1 className="text-xl font-semibold">{t('oauthConsent.title')}</h1>
    {user.isError || consent.isError || !/^[A-Za-z0-9_-]{43}$/.test(request) ? <p role="alert">{t('oauthConsent.unavailable')}</p> : consent.data ? <>
      <p><Trans t={t} i18nKey="oauthConsent.wantsToConnect" values={{ client: consent.data.client_name }} components={{ strong: <strong /> }} /></p>
      <p className="text-sm text-muted-foreground">{t('oauthConsent.signedInAs', { name: user.data?.display_name })}</p>
      {workspaces.length > 1 ? <div role="group" aria-labelledby="consent-workspaces" className="grid gap-3">
        <span id="consent-workspaces" className="text-sm font-medium">{t('oauthConsent.workspaces')}</span>
        {workspaces.map(({ id, name }) => <Label key={id} className="flex items-center gap-2">
          <Checkbox checked={id in picks} onCheckedChange={(checked) => toggleWorkspace(id, Boolean(checked))} />
          {name}
        </Label>)}
      </div> : workspaces.length ? <p className="text-sm"><Trans t={t} i18nKey="oauthConsent.singleWorkspace" values={{ name: workspaces[0].name }} components={{ strong: <strong /> }} /></p> : <p className="text-sm text-muted-foreground">{t('oauthConsent.noWorkspaces')}</p>}
      {workspaces.length ? <AccessPicker id="consent-access" resources={RESOURCES.map(({ id, ...resource }) => ({ ...resource, name: t(`oauthConsent.resources.${id}.name`), hint: t(`oauthConsent.resources.${id}.hint`), details: id === 'tasks' ? <div className="grid gap-4">
        {chosen.length ? chosen.map(({ id: workspaceId, name }) => {
          const projects = consent.data?.projects.filter((project) => project.workspace_id === workspaceId) ?? []
          return <div key={workspaceId} className="grid gap-2">
            {workspaces.length > 1 ? <p className="text-sm font-medium">{name}</p> : null}
            <ProjectPicker id={`consent-projects-${workspaceId}`} projects={projects} selected={pickOf(workspaceId).selected} onChange={(selected) => setPick(workspaceId, { selected })} all={pickOf(workspaceId).all} onAllChange={(all) => setPick(workspaceId, { all })} empty={!projects.length ? t('oauthConsent.noProjects') : undefined} />
          </div>
        }) : <p className="text-sm text-muted-foreground">{t('oauthConsent.selectWorkspaceFirst')}</p>}
      </div> : undefined }))} scopes={scopes} onChange={setScopes} /> : null}
      {workspaces.length ? <div className="flex items-center gap-1.5">
        <Label className="flex items-center gap-2">
          <Checkbox checked={remote} disabled={approve.isPending} onCheckedChange={(checked) => setRemote(Boolean(checked))} />
          {t('oauthConsent.remote')}
        </Label>
        <InfoTip text={t('oauthConsent.remoteHint')} />
      </div> : null}
      {approve.isError ? <p role="alert" className="text-sm text-destructive">{approve.error.message}</p> : null}
      <div className="flex gap-3">
        <Button variant="outline" disabled={approve.isPending} onClick={() => approve.mutate(false)}>{t('oauthConsent.deny')}</Button>
        {workspaces.length ? <Button disabled={!complete || approve.isPending} onClick={() => approve.mutate(true)}>{scopes.length ? t('oauthConsent.allowSelected') : t('oauthConsent.allowRead')}</Button> : null}
      </div>
      {workspaces.length ? <p className="text-xs text-muted-foreground"><Trans t={t} i18nKey="oauthConsent.redirect" values={{ url: consent.data.redirect_to }} components={{ strong: <strong className="break-words font-medium text-foreground" /> }} /></p> : null}
    </> : <p><LoadingText>{t('oauthConsent.loading')}</LoadingText></p>}
  </div></AuthCard>
}
