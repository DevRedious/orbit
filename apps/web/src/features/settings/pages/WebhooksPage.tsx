import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useState, type FormEvent } from 'react'
import { Copy, Global } from 'reicon-react'
import { ApiProblem } from '@orbit/api/problem'
import type { WebhookDelivery, WebhookEventType, WebhookSubscription } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { ProjectPicker } from '@/components/common/ScopeAccess'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingText } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { relativeTime } from '@/lib/format'
import { useProjects } from '@/features/tasks/api/projects'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { RequiredMark, RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'
import { useCreateWebhook, useDeleteWebhook, useRetryWebhookDelivery, useRotateWebhookSecret, useUpdateWebhook, useWebhookDeliveries, useWebhooks } from '@/features/settings/api/webhooks'

type SettingsT = TFunction<'settings'>

const EVENT_TYPES = [
  { value: 'task.created', label: 'webhooks.events.task_created' },
  { value: 'task.updated', label: 'webhooks.events.task_updated' },
  { value: 'task.deleted', label: 'webhooks.events.task_deleted' },
] as const satisfies ReadonlyArray<{ value: WebhookEventType; label: string }>

/** The field a `validation_failed` problem names (its detail) → its message key. */
const FIELD_MESSAGES = {
  name: 'webhooks.fieldErrors.name',
  url: 'webhooks.fieldErrors.url',
  event_types: 'webhooks.fieldErrors.event_types',
  project_ids: 'webhooks.fieldErrors.project_ids',
} as const

function failure(t: SettingsT, error: unknown, fallback: string) {
  if (!(error instanceof ApiProblem)) return fallback
  if (error.code === 'validation_failed') return Object.hasOwn(FIELD_MESSAGES, error.detail) ? t(FIELD_MESSAGES[error.detail as keyof typeof FIELD_MESSAGES]) : fallback
  if (error.code === 'app_key_missing') return error.detail
  return fallback
}

const STATE_BADGES: Record<string, { label: 'webhooks.states.pending' | 'webhooks.states.succeeded' | 'webhooks.states.failed' | 'webhooks.states.cancelled'; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
  pending: { label: 'webhooks.states.pending', variant: 'secondary' },
  succeeded: { label: 'webhooks.states.succeeded', variant: 'outline' },
  failed: { label: 'webhooks.states.failed', variant: 'destructive' },
  cancelled: { label: 'webhooks.states.cancelled', variant: 'secondary' },
}

export function WebhooksPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const canManage = useCan('integrations.manage')
  const webhooks = useWebhooks(workspace.id, canManage)
  const projectsQuery = useProjects(workspace.id, canManage)
  const projects = projectsQuery.data ?? []
  const projectNames = new Map(projects.map((project) => [project.id, project.name]))
  const updateWebhook = useUpdateWebhook(workspace.id)
  const deleteWebhook = useDeleteWebhook(workspace.id)
  const rotateSecret = useRotateWebhookSecret(workspace.id)
  const [editing, setEditing] = useState<WebhookSubscription | 'new'>()
  const [secret, setSecret] = useState<{ name: string; value: string }>()
  const [copied, setCopied] = useState(false)
  const [openDeliveries, setOpenDeliveries] = useState<string>()

  if (!canManage) return <SettingsCard title={t('webhooks.title')}><p className="m-0 text-muted-foreground">{t('webhooks.managersOnly')}</p></SettingsCard>

  function showSecret(name: string, value: string) {
    setSecret({ name, value })
    setCopied(false)
  }

  async function rotate(webhook: WebhookSubscription) {
    if (!await confirmAction({ title: t('webhooks.rotateTitle', { name: webhook.name }), description: t('webhooks.rotateDescription'), confirmLabel: t('webhooks.rotateConfirm') })) return
    try {
      showSecret(webhook.name, await rotateSecret.mutateAsync(webhook.id))
    } catch (error) {
      toast.error(failure(t, error, t('webhooks.rotateFailed')))
    }
  }

  return <>
    <SettingsCard title={t('webhooks.title')} description={t('webhooks.description')} actions={<Button type="button" onClick={() => setEditing('new')}>{t('webhooks.add')}</Button>}>
      {secret ? <div className="grid gap-2.5 rounded-lg border border-primary bg-primary/10 p-3 text-xs" role="status">
        <strong>{t('webhooks.copySecret', { name: secret.name })}</strong>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 [overflow-wrap:anywhere] select-all">{secret.value}</code>
          <Button variant="outline" type="button" onClick={() => { void navigator.clipboard.writeText(secret.value).then(() => { setCopied(true); toast(t('webhooks.secretCopied')) }, () => toast.error(t('webhooks.secretCopyFailed'))) }}><Copy className="size-4" /> {copied ? t('copied') : t('copy')}</Button>
        </div>
      </div> : <p className="m-0 text-muted-foreground"><Trans t={t} i18nKey="webhooks.signatureHint" components={{ code: <code /> }} /></p>}
    </SettingsCard>
    <SettingsCard title={t('webhooks.subscriptions')} flush>
      <div className="flex flex-col divide-y">
        {webhooks.isPending ? <SettingsRow><LoadingText>{t('webhooks.loading')}</LoadingText></SettingsRow> : null}
        {webhooks.isError ? <SettingsRow role="alert">{t('webhooks.loadFailed')}</SettingsRow> : null}
        {webhooks.data?.length === 0 ? <SettingsRow>{t('webhooks.empty')}</SettingsRow> : null}
        {webhooks.data?.map((webhook) => <div key={webhook.id} className="flex flex-col">
          <SettingsRow className="flex-nowrap">
            <RowIcon><Global /></RowIcon>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">{webhook.name}{webhook.enabled ? null : <Badge variant="secondary">{t('webhooks.off')}</Badge>}</span>
              <span className="truncate text-xs text-muted-foreground/70">{webhook.url}</span>
              <span className="text-xs text-muted-foreground/70">{webhook.event_types.join(', ')} · {webhook.project_ids.map((id) => projectNames.get(id) ?? t('webhooks.unavailableProject')).join(', ') || t('webhooks.noProjects')}</span>
            </div>
            <Switch aria-label={t('webhooks.sendEventsTo', { name: webhook.name })} checked={webhook.enabled} disabled={updateWebhook.isPending} onCheckedChange={(enabled) => updateWebhook.mutate({ webhookId: webhook.id, body: { enabled } }, { onError: (error) => toast.error(failure(t, error, t('webhooks.changeFailed'))) })} />
            <span className="flex gap-1">
              <Button variant="ghost" type="button" aria-expanded={openDeliveries === webhook.id} onClick={() => setOpenDeliveries(openDeliveries === webhook.id ? undefined : webhook.id)}>{t('webhooks.deliveries')}</Button>
              <Button variant="ghost" type="button" onClick={() => setEditing(webhook)}>{t('webhooks.edit')}</Button>
              <Button variant="ghost" type="button" disabled={rotateSecret.isPending} onClick={() => void rotate(webhook)}>{t('webhooks.rotateSecret')}</Button>
              <Button variant="ghost" type="button" disabled={deleteWebhook.isPending} onClick={async () => { if (await confirmAction({ title: t('webhooks.deleteTitle', { name: webhook.name }), description: t('webhooks.deleteDescription'), confirmLabel: t('delete'), danger: true })) deleteWebhook.mutate(webhook.id, { onError: () => toast.error(t('webhooks.deleteFailed')) }) }}>{t('delete')}</Button>
            </span>
          </SettingsRow>
          {openDeliveries === webhook.id ? <Deliveries workspaceId={workspace.id} webhookId={webhook.id} /> : null}
        </div>)}
      </div>
    </SettingsCard>
    {editing ? <WebhookDialog
      workspaceId={workspace.id}
      webhook={editing === 'new' ? undefined : editing}
      projects={projects}
      projectsLoading={projectsQuery.isPending}
      onClose={() => setEditing(undefined)}
      onCreated={(name, value) => showSecret(name, value)}
    /> : null}
  </>
}

function Deliveries({ workspaceId, webhookId }: { workspaceId: string; webhookId: string }) {
  const { t } = useTranslation('settings')
  const deliveries = useWebhookDeliveries(workspaceId, webhookId)
  const retry = useRetryWebhookDelivery(workspaceId, webhookId)
  return <div className="border-t bg-muted/30 px-4 py-3 text-xs">
    {deliveries.isPending ? <LoadingText>{t('webhooks.deliveriesLoading')}</LoadingText> : null}
    {deliveries.isError ? <p className="m-0" role="alert">{t('webhooks.deliveriesFailed')}</p> : null}
    {deliveries.data?.length === 0 ? <p className="m-0 text-muted-foreground">{t('webhooks.noDeliveries')}</p> : null}
    {deliveries.data?.length ? <table className="w-full border-collapse">
      <thead className="text-left text-muted-foreground">
        <tr><th className="py-1 pr-3 font-medium">{t('webhooks.columns.event')}</th><th className="py-1 pr-3 font-medium">{t('webhooks.columns.state')}</th><th className="py-1 pr-3 font-medium">{t('webhooks.columns.attempts')}</th><th className="py-1 pr-3 font-medium">{t('webhooks.columns.lastAnswer')}</th><th className="py-1 pr-3 font-medium">{t('webhooks.columns.created')}</th><th /></tr>
      </thead>
      <tbody>
        {deliveries.data.map((delivery) => <DeliveryRow key={delivery.id} delivery={delivery} retrying={retry.isPending} onRetry={() => retry.mutate(delivery.id, { onError: () => toast.error(t('webhooks.retryFailed')) })} />)}
      </tbody>
    </table> : null}
  </div>
}

function DeliveryRow({ delivery, retrying, onRetry }: { delivery: WebhookDelivery; retrying: boolean; onRetry: () => void }) {
  const { t } = useTranslation('settings')
  const known = STATE_BADGES[delivery.state]
  const badge = known ? { label: t(known.label), variant: known.variant } : { label: delivery.state, variant: 'secondary' as const }
  const answer = delivery.last_status != null ? `HTTP ${delivery.last_status}` : delivery.last_error ?? '—'
  return <tr className="border-t border-border/60">
    <td className="py-1.5 pr-3"><code>{delivery.event_type}</code></td>
    <td className="py-1.5 pr-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
    <td className="py-1.5 pr-3 tabular-nums">{delivery.attempt_count}</td>
    <td className="py-1.5 pr-3">{answer}</td>
    <td className="py-1.5 pr-3 text-muted-foreground">{relativeTime(delivery.created_at)}</td>
    <td className="py-1.5 text-right">{delivery.state === 'failed' || delivery.state === 'cancelled' ? <Button size="sm" variant="outline" type="button" disabled={retrying} onClick={onRetry}>{t('retry')}</Button> : null}</td>
  </tr>
}

function WebhookDialog({ workspaceId, webhook, projects, projectsLoading, onClose, onCreated }: {
  workspaceId: string
  webhook?: WebhookSubscription
  projects: { id: string; name: string }[]
  projectsLoading: boolean
  onClose: () => void
  onCreated: (name: string, secret: string) => void
}) {
  const { t } = useTranslation('settings')
  const createWebhook = useCreateWebhook(workspaceId)
  const updateWebhook = useUpdateWebhook(workspaceId)
  const [name, setName] = useState(webhook?.name ?? '')
  const [url, setUrl] = useState(webhook?.url ?? '')
  const [eventTypes, setEventTypes] = useState<WebhookEventType[]>(webhook?.event_types ?? EVENT_TYPES.map((event) => event.value))
  const [projectIds, setProjectIds] = useState<string[]>(webhook?.project_ids ?? [])
  const [enabled, setEnabled] = useState(webhook?.enabled ?? true)
  const [error, setError] = useState<string>()
  const pending = createWebhook.isPending || updateWebhook.isPending
  const ready = name.trim() !== '' && url.trim() !== '' && eventTypes.length > 0 && projectIds.length > 0

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    const body = { name: name.trim(), url: url.trim(), event_types: eventTypes, project_ids: projectIds, enabled }
    setError(undefined)
    try {
      if (webhook) {
        await updateWebhook.mutateAsync({ webhookId: webhook.id, body })
      } else {
        const created = await createWebhook.mutateAsync(body)
        onCreated(created.name, created.signing_secret)
      }
      onClose()
    } catch (caught) {
      setError(failure(t, caught, webhook ? t('webhooks.saveFailed') : t('webhooks.createFailed')))
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{webhook ? t('webhooks.editTitle', { name: webhook.name }) : t('webhooks.add')}</DialogTitle>
        <DialogDescription>{webhook ? t('webhooks.editDescription') : t('webhooks.addDescription')}</DialogDescription>
      </DialogHeader>
      <form id="webhook-form" className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field><FieldLabel htmlFor="webhook-name">{t('name')} <RequiredMark /></FieldLabel><Input id="webhook-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder={t('webhooks.namePlaceholder')} /></Field>
        <Field><FieldLabel htmlFor="webhook-url">{t('webhooks.url')} <RequiredMark /></FieldLabel><Input id="webhook-url" type="url" value={url} maxLength={2048} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/orbit-webhook" /></Field>
        <div role="group" aria-labelledby="webhook-events" className="grid gap-3">
          <span id="webhook-events" className="text-sm font-medium">{t('webhooks.eventsLabel')} <RequiredMark /></span>
          {EVENT_TYPES.map((option) => <Label key={option.value} className="flex items-center gap-2">
            <Checkbox checked={eventTypes.includes(option.value)} onCheckedChange={(checked) => setEventTypes(checked ? [...eventTypes, option.value] : eventTypes.filter((other) => other !== option.value))} />
            {t(option.label)}
          </Label>)}
        </div>
        <div className="grid gap-3">
          <span className="text-sm font-medium">{t('webhooks.projects')} <RequiredMark /></span>
          <ProjectPicker id="webhook-projects" projects={projects} selected={projectIds} onChange={setProjectIds} empty={projectsLoading ? t('webhooks.loadingProjects') : projects.length ? undefined : t('webhooks.noActiveProjects')} />
        </div>
        <Label className="flex items-center gap-2"><Switch checked={enabled} onCheckedChange={setEnabled} /> {t('webhooks.sendEvents')}</Label>
        {error ? <p className="m-0 text-destructive" role="alert">{error}</p> : null}
      </form>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" form="webhook-form" disabled={pending || !ready}>{webhook ? t('webhooks.save') : t('webhooks.add')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
