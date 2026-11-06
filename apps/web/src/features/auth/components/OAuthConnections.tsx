import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/common/SettingsCard'
import type { OAuthConnection } from '@orbit/api/mcp'
import { oauthRequest } from '@/features/auth/oauth'
import { i18n } from '@/i18n'

export function OAuthConnections() {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const connections = useQuery({ queryKey: ['oauth-grants'], queryFn: () => oauthRequest<{ items: OAuthConnection[] }>('/api/v1/oauth/grants') })
  const disconnect = useMutation({
    mutationFn: (id: string) => oauthRequest<void>(`/api/v1/oauth/grants/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oauth-grants'] }),
  })
  return <SettingsCard title={t('connections.title')} description={t('connections.description')}>
    {connections.isPending ? <p>{t('connections.loading')}</p> : null}
    {connections.isError || disconnect.isError ? <p role="alert">{t('connections.failed')}</p> : null}
    {connections.data?.items.length === 0 ? <p className="text-sm text-muted-foreground">{t('connections.empty')}</p> : null}
    <div className="flex flex-col divide-y">{connections.data?.items.map((connection) => <div key={connection.id} className="flex items-center justify-between gap-4 py-3">
      <div><p className="text-sm font-medium">{connection.client_name}</p><p className="text-xs text-muted-foreground">{connection.workspace_name} · {connection.scope} · {connection.all_projects ? t('connections.allProjects') : connection.project_names.join(', ')} · {t('connections.connectedAt', { date: connectedAt(connection.created_at) })}</p></div>
      <Button variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate(connection.id)}>{t('connections.disconnect')}</Button>
    </div>)}</div>
  </SettingsCard>
}

const connectedAt = (millis: number) => new Date(millis).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
