import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Copy, Key } from 'reicon-react'
import { confirmAction } from '@/components/common/confirmAction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { relativeTime, shortDate } from '@/lib/format'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { useProjects } from '@/features/tasks/api/projects'
import { SettingsCard } from '@/components/common/SettingsCard'
import { AccessPicker, ProjectPicker, type ScopeResource } from '@/components/common/ScopeAccess'
import { FieldGrid, RequiredMark, RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'
import { useApiTokens, useCreateApiToken, useRevokeApiToken } from '@/features/settings/api/apiTokens'
import type { ApiTokenScope } from '@orbit/api/generated/types.gen'

const EXPIRATION_OPTIONS = [
  { value: 'never', label: 'apiTokens.expirationOptions.never' },
  { value: '7', label: 'apiTokens.expirationOptions.days7' },
  { value: '30', label: 'apiTokens.expirationOptions.days30' },
  { value: '90', label: 'apiTokens.expirationOptions.days90' },
  { value: '365', label: 'apiTokens.expirationOptions.year1' },
] as const

type ExpirationValue = typeof EXPIRATION_OPTIONS[number]['value']

function tokenResources(t: TFunction<'settings'>, serviceAccount: boolean, projects: ReactNode): ScopeResource<ApiTokenScope>[] {
  return [
    { name: t('apiTokens.resources.tasks'), hint: t('apiTokens.resources.tasksHint'), read: 'tasks:read', write: 'tasks:write', details: projects },
    { name: t('apiTokens.resources.docs'), hint: t('apiTokens.resources.docsHint'), read: 'docs:read', write: 'docs:write', disabled: serviceAccount },
    { name: t('apiTokens.resources.chat'), hint: t('apiTokens.resources.chatHint'), read: 'chat:read', disabled: serviceAccount },
  ]
}


function isExpired(expiresAt?: string | null) {
  return expiresAt != null && new Date(expiresAt).getTime() <= Date.now()
}

export function ApiTokensPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const canManage = useCan('api_tokens.manage')
  const tokens = useApiTokens(workspace.id, canManage)
  const projectsQuery = useProjects(workspace.id, canManage)
  const projects = projectsQuery.data ?? []
  const createToken = useCreateApiToken(workspace.id)
  const revokeToken = useRevokeApiToken(workspace.id)
  const [name, setName] = useState('')
  const [projectIds, setProjectIds] = useState<string[]>([])
  const [allProjects, setAllProjects] = useState(false)
  const projectNames = new Map(projects.map((project) => [project.id, project.name]))
  const [scopes, setScopes] = useState<ApiTokenScope[]>(['tasks:read'])
  const [serviceAccount, setServiceAccount] = useState(false)
  const [expiration, setExpiration] = useState<ExpirationValue>('never')
  const [issuedToken, setIssuedToken] = useState<string>()
  const [copied, setCopied] = useState(false)

  // Projects only limit task access, so a token without a task scope needs none.
  const taskScope = scopes.some((scope) => scope.startsWith('tasks:'))
  const ready = name.trim() !== '' && scopes.length > 0 && (!taskScope || allProjects || projectIds.length > 0)

  if (!canManage) return <SettingsCard title={t('apiTokens.title')}><p className="m-0 text-muted-foreground">{t('apiTokens.managersOnly')}</p></SettingsCard>
  // `items` lets Select.Value render the option label instead of the raw value.
  const expirationOptions = EXPIRATION_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))

  // A service account has task access only, so selecting it drops the docs and chat scopes.
  function selectServiceAccount(checked: boolean) {
    setServiceAccount(checked)
    if (!checked) return
    const taskScopes = scopes.filter((scope) => scope.startsWith('tasks:'))
    setScopes(taskScopes.length ? taskScopes : ['tasks:read'])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    const issued = await createToken.mutateAsync({ name: name.trim(), projectIds: taskScope && !allProjects ? projectIds : [], allProjects: taskScope && allProjects, scopes, serviceAccount, expiresInDays: expiration === 'never' ? null : Number(expiration) })
    setIssuedToken(issued.token)
    setName('')
    setCopied(false)
  }

  return <>
    <SettingsCard title={t('apiTokens.create.title')} description={t('apiTokens.create.description')}>
      <form onSubmit={(event) => void submit(event)}>
        <FieldGrid>
        <Field><FieldLabel htmlFor="api-token-name">{t('apiTokens.create.name')} <RequiredMark /></FieldLabel><Input id="api-token-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder={t('apiTokens.create.namePlaceholder')} /></Field>
        <Field>
          <FieldLabel htmlFor="api-token-expiration">{t('apiTokens.create.expiration')}</FieldLabel>
          <Select items={expirationOptions} value={expiration} onValueChange={(value) => setExpiration(value as ExpirationValue)}>
            <SelectTrigger id="api-token-expiration" aria-label={t('apiTokens.create.expiration')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expirationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {/* a choice card: the whole card toggles the checkbox and tints while checked */}
        <FieldLabel className="min-[900px]:col-span-2">
          <Field orientation="horizontal">
            <Checkbox checked={serviceAccount} onCheckedChange={selectServiceAccount} />
            <FieldContent>
              <FieldTitle>{t('apiTokens.create.serviceAccount')}</FieldTitle>
              <FieldDescription>{t('apiTokens.create.serviceAccountHint')}</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <div className="min-[900px]:col-span-2">
          <AccessPicker id="api-token-access" resources={tokenResources(t, serviceAccount, taskScope ? <ProjectPicker id="api-token-projects" projects={projects} selected={projectIds} onChange={setProjectIds} all={allProjects} onAllChange={setAllProjects} empty={projectsQuery.isPending ? t('apiTokens.create.loadingProjects') : projects.length ? undefined : t('apiTokens.create.noProjects')} /> : null)} scopes={scopes} onChange={setScopes} />
        </div>
        <Button className="justify-self-start" type="submit" disabled={createToken.isPending || !ready}>{t('apiTokens.create.submit')}</Button>
        {createToken.isError ? <p className="text-destructive" role="alert">{t('apiTokens.create.failed')}</p> : null}
        </FieldGrid>
      </form>
      {issuedToken ? <div className="mt-[18px] grid gap-2.5 rounded-lg border border-primary bg-primary/10 p-3 text-xs" role="status"><strong>{t('apiTokens.create.copyNow')}</strong><div className="flex items-center gap-2"><code className="min-w-0 flex-1 [overflow-wrap:anywhere] select-all">{issuedToken}</code><Button variant="outline" type="button" onClick={() => { void navigator.clipboard.writeText(issuedToken).then(() => { setCopied(true); toast(t('apiTokens.create.tokenCopied')) }, () => toast.error(t('apiTokens.create.copyFailed'))) }}><Copy className="size-4" /> {copied ? t('copied') : t('copy')}</Button></div></div> : null}
    </SettingsCard>
    <SettingsCard title={t('apiTokens.active.title')} flush>
      <div className="flex flex-col divide-y">
        {tokens.isPending ? <SettingsRow>{t('apiTokens.active.loading')}</SettingsRow> : null}
        {tokens.isError ? <SettingsRow role="alert">{t('apiTokens.active.loadFailed')}</SettingsRow> : null}
        {tokens.data?.length === 0 ? <SettingsRow>{t('apiTokens.active.empty')}</SettingsRow> : null}
        {tokens.data?.map((token) => <SettingsRow className="flex-nowrap" key={token.id}>
          <RowIcon><Key /></RowIcon>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="flex items-center gap-2 text-[13px] font-medium text-foreground">{token.name}{isExpired(token.expires_at) ? <Badge variant="destructive">{t('apiTokens.active.expiredBadge')}</Badge> : null}</span><span className="text-xs text-muted-foreground/70">{token.service_account_name ? t('apiTokens.active.serviceAccount', { name: token.service_account_name }) : t('apiTokens.active.personal')} · <code>{token.token_prefix}…</code> · {token.all_projects ? `${t('apiTokens.active.allProjects')} · ` : token.project_ids.length ? `${token.project_ids.map((id) => projectNames.get(id) ?? t('apiTokens.active.unavailableProject')).join(', ')} · ` : null}{token.expires_at ? t(isExpired(token.expires_at) ? 'apiTokens.active.expired' : 'apiTokens.active.expires', { date: shortDate(token.expires_at) }) : t('apiTokens.active.neverExpires')} · {t('apiTokens.active.created', { time: relativeTime(token.created_at) })}</span></div>
          <span className="flex gap-1">{token.scopes.map((scope) => <Badge variant="secondary" key={scope}>{scope}</Badge>)}</span>
          <Button variant="ghost" type="button" disabled={revokeToken.isPending} onClick={async () => { if (await confirmAction({ title: t('apiTokens.revokeConfirm.title', { name: token.name }), description: t('apiTokens.revokeConfirm.description'), confirmLabel: t('revoke'), danger: true })) revokeToken.mutate(token.id) }}>{t('revoke')}</Button>
        </SettingsRow>)}
      </div>
    </SettingsCard>
  </>
}
