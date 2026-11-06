import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/api'
import { useLeaveWorkspace, useMembers } from '@/features/workspaces/api'
import { useBillingEnabled } from '@/features/workspaces/billing'
import { useWorkspace } from '@/features/workspaces/workspaceContext'

/** Any member may leave a workspace; its owner must transfer ownership first (`can_remove` on the caller's own row). */
export function WorkspaceLeave() {
  const { t } = useTranslation('settings')
  const { workspace, workspaces } = useWorkspace()
  const userId = useCurrentUser().data?.id
  const members = useMembers(workspace.id)
  const leave = useLeaveWorkspace(workspace.id)
  const navigate = useNavigate()
  const membership = members.data?.find((member) => member.id === userId)
  // Orbit Cloud refuses ownership transfer.
  const billing = useBillingEnabled()

  // The server allows everyone but the owner to leave.
  if (membership && !membership.can.remove) return (
    <SettingsCard title={t('leave.title')}>
      <p className="text-[13px] text-muted-foreground">
        <Trans
          t={t}
          i18nKey={billing ? 'leave.ownerCloud' : 'leave.ownerTransfer'}
          components={{
            members: <Link to="/settings/members" className="text-foreground underline underline-offset-4" />,
            dangerZone: <Link to="/settings/danger-zone" className="text-foreground underline underline-offset-4" />,
          }}
        />
      </p>
    </SettingsCard>
  )

  async function leaveConfirmed() {
    if (!membership || leave.isPending) return
    const confirmed = await confirmAction({
      title: t('leave.confirmTitle', { name: workspace.name }),
      description: t('leave.confirmDescription'),
      confirmLabel: t('leave.confirm'),
      danger: true,
    })
    if (!confirmed) return
    try {
      await leave.mutateAsync(membership)
    } catch {
      return // The card shows the error.
    }
    // With no other workspace, `WorkspaceProvider` opens the onboarding (or Admin, for an operator).
    const next = workspaces.find((item) => item.id !== workspace.id)
    if (next) navigate(`/tasks?${new URLSearchParams({ workspace: next.id })}`, { replace: true })
  }

  return (
    <SettingsCard title={t('leave.title')}>
      <div className="flex flex-col items-start gap-2">
        <Button type="button" variant="destructive" disabled={!membership || leave.isPending} onClick={() => void leaveConfirmed()}>
          {leave.isPending ? t('leave.leaving') : t('leave.confirm')}
        </Button>
        {leave.isError ? <p role="alert" className="text-[13px] text-destructive">{t('leave.failed')}</p> : null}
      </div>
    </SettingsCard>
  )
}
