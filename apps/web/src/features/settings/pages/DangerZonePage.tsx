import { useTranslation } from 'react-i18next'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { SettingsCard } from '@/components/common/SettingsCard'
import { WorkspaceDangerZone } from '@/features/settings/components/WorkspaceDangerZone'

export function DangerZonePage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  if (!useCan('workspace.delete')) return (
    <SettingsCard title={t('dangerZone.title')}>
      <p>{t('dangerZone.ownerOnly')}</p>
    </SettingsCard>
  )
  return <WorkspaceDangerZone key={workspace.id} />
}
