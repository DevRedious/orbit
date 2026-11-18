import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Add, Copy, Danger, Edit, Flash, Key, MoreH, Trash } from 'reicon-react'
import { toast } from 'sonner'
import { confirmAction } from '@/components/common/confirmAction'
import { InfoTip } from '@/components/common/InfoTip'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import type { CreatedWebhook } from '@/features/chat/api/client'
import {
  useCreateWebhook,
  useDeleteWebhook,
  useRotateWebhook,
  useSetWebhookInteractivity,
  useUpdateWebhook,
  useWebhookSigningSecret,
} from '@/features/chat/api/mutations'
import { useWebhookDeliveries, useWebhooks } from '@/features/chat/api/queries'
import type { ChannelWebhook, Conversation } from '@/features/chat/api/types'
import { BotAvatar } from '@/features/chat/components/messages/BotAvatar'
import { authorName, useChatPeople } from '@/features/chat/components/messages/people'
import { relativeAgo } from '@/features/chat/lib/time'
import { i18n } from '@/i18n'
import { chatErrorMessage } from './channelLib'

const NAME_MAX = 80

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(done),
    () => toast.error(i18n.t('chat:webhooks.copyFailed')),
  )
}

/** The curl command that posts a test message to `url`. */
function curlExample(url: string): string {
  return `curl -X POST -H 'Content-Type: application/json' \\\n  -d '{"text": "Deploy **finished** :rocket:"}' \\\n  '${url}'`
}

/**
 * The incoming webhooks of a channel: a secret URL that an external tool posts JSON to, so a message shows in the
 * channel as that tool. The URL holds the secret, so it shows only right after it is made or rotated.
 */
export function ChannelWebhooks({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation('chat')
  const webhooks = useWebhooks(conversation.id)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [shown, setShown] = useState<CreatedWebhook | null>(null)
  const rotate = useRotateWebhook()
  const remove = useDeleteWebhook()
  const list = webhooks.data ?? []

  const rotateUrl = async (webhook: ChannelWebhook) => {
    const confirmed = await confirmAction({
      title: t('webhooks.rotate.title', { name: webhook.name }),
      description: t('webhooks.rotate.description'),
      confirmLabel: t('webhooks.rotate.confirm'),
      danger: true,
    })
    if (!confirmed) return
    rotate.mutate(
      { conversationId: conversation.id, webhookId: webhook.id },
      { onSuccess: setShown, onError: (error) => toast.error(chatErrorMessage(error, t('webhooks.rotate.failed'))) },
    )
  }

  const deleteWebhook = async (webhook: ChannelWebhook) => {
    const confirmed = await confirmAction({
      title: t('webhooks.delete.title', { name: webhook.name }),
      description: t('webhooks.delete.description'),
      confirmLabel: t('webhooks.delete.confirm'),
      danger: true,
    })
    if (!confirmed) return
    if (shown?.webhook.id === webhook.id) setShown(null)
    remove.mutate(
      { conversationId: conversation.id, webhookId: webhook.id },
      { onError: (error) => toast.error(chatErrorMessage(error, t('webhooks.delete.failed'))) },
    )
  }

  return (
    <div data-slot="channel-webhooks" className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {t('webhooks.intro', { name: conversation.name })}
      </p>

      {shown ? <WebhookUrl created={shown} onDone={() => setShown(null)} /> : null}

      {webhooks.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {chatErrorMessage(webhooks.error, t('webhooks.loadFailed'))}
        </p>
      ) : webhooks.isPending ? null : list.length === 0 && !creating ? (
        <div className="grid justify-items-start gap-3 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">{t('webhooks.empty')}</p>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Add data-icon="inline-start" />
            {t('webhooks.new')}
          </Button>
        </div>
      ) : (
        <ul className="grid gap-1">
          {list.map((webhook) =>
            editing === webhook.id ? (
              <li key={webhook.id}>
                <WebhookForm conversationId={conversation.id} webhook={webhook} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <WebhookRow
                key={webhook.id}
                webhook={webhook}
                conversationId={conversation.id}
                onRename={() => setEditing(webhook.id)}
                onRotate={() => void rotateUrl(webhook)}
                onDelete={() => void deleteWebhook(webhook)}
              />
            ),
          )}
        </ul>
      )}

      {creating ? (
        <WebhookForm
          conversationId={conversation.id}
          onDone={(created) => {
            setCreating(false)
            if (created) setShown(created)
          }}
        />
      ) : list.length > 0 ? (
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setCreating(true)}>
          <Add data-icon="inline-start" />
          {t('webhooks.new')}
        </Button>
      ) : null}
    </div>
  )
}

function WebhookRow({
  webhook,
  conversationId,
  onRename,
  onRotate,
  onDelete,
}: {
  webhook: ChannelWebhook
  conversationId: string
  onRename: () => void
  onRotate: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation('chat')
  const [interactivityOpen, setInteractivityOpen] = useState(false)
  const people = useChatPeople()
  const creator = authorName(people, webhook.createdBy, null, t('webhooks.row.formerMember'))
  const used = webhook.lastUsedAt === null ? t('webhooks.row.neverUsed') : t('webhooks.row.lastUsed', { time: relativeAgo(webhook.lastUsedAt) })
  return (
    <li data-slot="channel-webhook" className="grid gap-2">
      <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
        <BotAvatar bot={webhook} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{webhook.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t('webhooks.row.madeBy', { name: creator })} · {used}
            {webhook.requestUrl ? ` · ${t('webhooks.row.buttonsOn')}` : ''}
            {webhook.events ? ` · ${t('webhooks.row.eventsOn')}` : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t('webhooks.row.options', { name: webhook.name })} />
            }
          >
            <MoreH />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Edit />
              {t('webhooks.row.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRotate}>
              <Key />
              {t('webhooks.rotate.confirm')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInteractivityOpen((open) => !open)}>
              <Flash />
              {t('webhooks.row.interactivity')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash />
              {t('webhooks.delete.confirm')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {interactivityOpen ? (
        <WebhookInteractivity webhook={webhook} conversationId={conversationId} onClose={() => setInteractivityOpen(false)} />
      ) : null}
    </li>
  )
}

/**
 * Where clicks on the webhook's buttons (and, with events on, members' messages) go, the secret that signs them, and the
 * last deliveries with their answers. The receiver checks `X-Slack-Signature` as for Slack, and answers through the
 * click's `response_url` or the webhook URL.
 */
function WebhookInteractivity({ webhook, conversationId, onClose }: { webhook: ChannelWebhook; conversationId: string; onClose: () => void }) {
  const { t } = useTranslation('chat')
  const [requestUrl, setRequestUrl] = useState(webhook.requestUrl ?? '')
  const [secret, setSecret] = useState<string | null>(null)
  const save = useSetWebhookInteractivity()
  const signingSecret = useWebhookSigningSecret()
  const deliveries = useWebhookDeliveries(conversationId, webhook.id, webhook.requestUrl !== null)
  const urlId = useId()
  const secretId = useId()
  const eventsId = useId()
  const changed = requestUrl.trim() !== (webhook.requestUrl ?? '')

  const submit = (url: string | null, events: boolean) =>
    save.mutate(
      { conversationId, webhookId: webhook.id, requestUrl: url, events: url !== null && events },
      {
        onSuccess: (next) => {
          setRequestUrl(next.requestUrl ?? '')
          toast.success(
            next.events
              ? t('webhooks.interactivity.savedEvents')
              : next.requestUrl
                ? t('webhooks.interactivity.savedButtons')
                : t('webhooks.interactivity.savedOff'),
          )
        },
      },
    )
  const loadSecret = async (rotate: boolean) => {
    if (rotate) {
      const confirmed = await confirmAction({
        title: t('webhooks.secret.rotateTitle'),
        description: t('webhooks.secret.rotateDescription'),
        confirmLabel: t('webhooks.secret.rotateConfirm'),
        danger: true,
      })
      if (!confirmed) return
    }
    signingSecret.mutate(
      { conversationId, webhookId: webhook.id, rotate },
      { onSuccess: setSecret, onError: (error) => toast.error(chatErrorMessage(error, t('webhooks.secret.loadFailed'))) },
    )
  }

  return (
    <div data-slot="webhook-interactivity" className="grid gap-5 rounded-lg border p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (requestUrl.trim()) submit(requestUrl.trim(), webhook.events)
        }}
      >
        <Field data-invalid={save.isError || undefined}>
          <FieldLabel htmlFor={urlId}>
            {t('webhooks.interactivity.requestUrl')}
            <InfoTip text={t('webhooks.interactivity.requestUrlHint')} />
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              id={urlId}
              type="url"
              inputMode="url"
              placeholder="https://example.com/slack/actions"
              value={requestUrl}
              onChange={(event) => setRequestUrl(event.target.value)}
            />
            <Button type="submit" disabled={!requestUrl.trim() || !changed || save.isPending}>
              {save.isPending ? t('webhooks.saving') : t('webhooks.save')}
            </Button>
          </div>
          {save.isError ? (
            <FieldError>{chatErrorMessage(save.error, t('webhooks.interactivity.saveFailed'), { conflict: t('webhooks.interactivity.publicUrl') })}</FieldError>
          ) : null}
        </Field>
      </form>

      {webhook.requestUrl ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <label htmlFor={eventsId} className="text-sm font-medium">
                {t('webhooks.interactivity.events')}
              </label>
              <InfoTip
                text={t('webhooks.interactivity.eventsHint', { name: webhook.name })}
              />
            </div>
            <Switch
              id={eventsId}
              checked={webhook.events}
              disabled={save.isPending}
              onCheckedChange={(checked: boolean) => submit(webhook.requestUrl, checked)}
            />
          </div>

          <Field>
            <FieldLabel htmlFor={secretId}>{t('webhooks.secret.label')}</FieldLabel>
            <div className="flex gap-2">
              <InputGroup>
                <InputGroupInput id={secretId} readOnly value={secret ?? '••••••••••••••••••••••••••••••••'} className="font-mono text-xs" />
                <InputGroupAddon align="inline-end">
                  {secret ? (
                    <InputGroupButton aria-label={t('webhooks.secret.copy')} size="icon-xs" onClick={() => copy(secret, t('webhooks.secret.copied'))}>
                      <Copy />
                    </InputGroupButton>
                  ) : (
                    <InputGroupButton size="xs" disabled={signingSecret.isPending} onClick={() => void loadSecret(false)}>
                      {t('webhooks.secret.reveal')}
                    </InputGroupButton>
                  )}
                </InputGroupAddon>
              </InputGroup>
              <Button type="button" variant="outline" disabled={signingSecret.isPending} onClick={() => void loadSecret(true)}>
                <Key data-icon="inline-start" />
                {t('webhooks.secret.makeNew')}
              </Button>
            </div>
          </Field>

          <div className="grid gap-2">
            <p className="text-sm font-medium">{t('webhooks.deliveries.title')}</p>
            {deliveries.data && deliveries.data.length > 0 ? (
              <ul className="grid gap-1 text-xs">
                {deliveries.data.map((delivery) => {
                  const good = delivery.status !== null && delivery.status >= 200 && delivery.status < 300
                  return (
                    <li key={delivery.id} className="flex items-center gap-2">
                      <span className={good ? 'text-emerald-500' : 'text-destructive'}>{delivery.status ?? delivery.error}</span>
                      <span className="truncate font-mono">{delivery.actionId}</span>
                      <span className="ml-auto shrink-0 text-muted-foreground">
                        {t('webhooks.deliveries.duration', { ms: delivery.durationMs })} · {relativeAgo(delivery.createdAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t('webhooks.deliveries.empty')}</p>
            )}
          </div>
        </>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        {webhook.requestUrl ? (
          <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={save.isPending} onClick={() => submit(null, false)}>
            {t('webhooks.interactivity.remove')}
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t('close', { ns: 'common' })}
        </Button>
      </div>
    </div>
  )
}

/** Makes a webhook, or edits the name and icon of `webhook`. `onDone` gets the new webhook and its URL after a create. */
function WebhookForm({
  conversationId,
  webhook,
  onDone,
}: {
  conversationId: string
  webhook?: ChannelWebhook
  onDone: (created?: CreatedWebhook) => void
}) {
  const { t } = useTranslation('chat')
  const create = useCreateWebhook()
  const update = useUpdateWebhook()
  const [name, setName] = useState(webhook?.name ?? '')
  const [iconUrl, setIconUrl] = useState(webhook?.iconUrl ?? '')
  const nameId = useId()
  const iconId = useId()
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error
  const iconInvalid = iconUrl.trim() !== '' && !iconUrl.trim().startsWith('https://')

  const submit = async () => {
    const input = { conversationId, name: name.trim(), iconUrl: iconUrl.trim() || null }
    if (!input.name || iconInvalid || pending) return
    try {
      if (webhook) {
        await update.mutateAsync({ ...input, webhookId: webhook.id })
        onDone()
      } else {
        onDone(await create.mutateAsync(input))
      }
    } catch {
      // The error shows above the buttons.
    }
  }

  return (
    <form
      className="grid gap-3 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        // The dialog's own form must not get this submit.
        event.stopPropagation()
        void submit()
      }}
    >
      <Field>
        <FieldLabel htmlFor={nameId}>{t('webhooks.form.name')}</FieldLabel>
        <Input id={nameId} autoFocus required maxLength={NAME_MAX} placeholder="CI" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field data-invalid={iconInvalid || undefined}>
        <FieldLabel htmlFor={iconId}>{t('webhooks.form.iconUrl')}</FieldLabel>
        <Input
          id={iconId}
          type="url"
          inputMode="url"
          placeholder="https://example.com/icon.png"
          value={iconUrl}
          aria-invalid={iconInvalid || undefined}
          onChange={(event) => setIconUrl(event.target.value)}
        />
        {iconInvalid ? <FieldError>{t('webhooks.form.iconInvalid')}</FieldError> : null}
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {chatErrorMessage(error, t('webhooks.form.saveFailed'), {
            conflict: t('webhooks.form.limit', { count: 10 }),
            forbidden: t('webhooks.form.forbidden'),
          })}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onDone()}>
          {t('dialogs.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim() || iconInvalid || pending}>
          {pending ? t('webhooks.saving') : webhook ? t('webhooks.save') : t('webhooks.form.create')}
        </Button>
      </div>
    </form>
  )
}

/** The URL of a webhook that was just made or rotated, with a curl example. It does not show again. */
function WebhookUrl({ created, onDone }: { created: CreatedWebhook; onDone: () => void }) {
  const { t } = useTranslation('chat')
  const urlId = useId()
  const example = curlExample(created.url)
  return (
    <div data-slot="webhook-url" className="grid gap-3 rounded-lg border p-3">
      <Field>
        <FieldLabel htmlFor={urlId}>{t('webhooks.url.label', { name: created.webhook.name })}</FieldLabel>
        <InputGroup>
          <InputGroupInput id={urlId} readOnly value={created.url} className="font-mono text-xs" onFocus={(event) => event.target.select()} />
          <InputGroupAddon align="inline-end">
            <InputGroupButton aria-label={t('webhooks.url.copy')} size="icon-xs" onClick={() => copy(created.url, t('webhooks.url.copied'))}>
              <Copy />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Danger aria-hidden="true" className="mt-px size-4 shrink-0 text-amber-500" />
        {t('webhooks.url.once')}
      </p>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{t('webhooks.url.tryIt')}</span>
          <Button type="button" variant="ghost" size="xs" onClick={() => copy(example, t('webhooks.url.commandCopied'))}>
            <Copy data-icon="inline-start" />
            {t('webhooks.url.copyCommand')}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre">{example}</pre>
      </div>
      <Button type="button" size="sm" variant="outline" className="justify-self-end" onClick={onDone}>
        {t('done', { ns: 'common' })}
      </Button>
    </div>
  )
}
