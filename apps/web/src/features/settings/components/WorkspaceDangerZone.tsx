import { useId, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { useDeleteWorkspace } from '@/features/workspaces/api'
import { useWorkspaceBilling } from '@/features/workspaces/billing'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { SettingsCard } from '@/components/common/SettingsCard'

export function WorkspaceDangerZone() {
  const { t } = useTranslation('settings')
  const { workspace, workspaces } = useWorkspace()
  const canDelete = useCan('workspace.delete')
  const navigate = useNavigate()
  const deletion = useDeleteWorkspace(workspace.id)
  // The server cancels a subscription that has not ended when the workspace is deleted.
  const status = useWorkspaceBilling().data?.status
  const subscribed = status != null && status !== 'canceled' && status !== 'incomplete_expired'
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const inputId = useId()
  // Blocks a second submit before `deletion.isPending` has rendered.
  const deleting = useRef(false)

  if (!canDelete) return null

  async function deleteConfirmed() {
    if (confirmation !== workspace.name || deleting.current) return
    deleting.current = true
    try {
      await deletion.mutateAsync(workspace.version)
      setOpen(false)
      const next = workspaces.find((item) => item.id !== workspace.id)
      if (next) navigate(`/settings?${new URLSearchParams({ workspace: next.id })}`, { replace: true })
    } catch {
      // Keep the confirmation open and show the mutation error.
    } finally {
      deleting.current = false
    }
  }

  return <>
    <SettingsCard className="shadow-[0_0_0_1px_var(--destructive)] hover:shadow-[0_0_0_1px_var(--destructive)] [&_h3]:text-destructive [&>div]:bg-transparent [&>div]:shadow-none" title={t('dangerZone.title')} description={t('dangerZone.description')}>
      <Button type="button" variant="destructive" onClick={() => { setConfirmation(''); deletion.reset(); setOpen(true) }}>{t('dangerZone.delete')}</Button>
    </SettingsCard>
    {open ? (
      <Modal title={t('dangerZone.confirmTitle')} description={t('dangerZone.confirmDescription', { name: workspace.name })} onClose={() => setOpen(false)} dismissible={!deletion.isPending} className="sm:max-w-120">
        <form onSubmit={(event) => { event.preventDefault(); void deleteConfirmed() }}>
          {workspaces.length === 1 ? <p className="my-3 text-[13px] text-destructive">{t('dangerZone.lastWorkspace')}</p> : null}
          {subscribed ? <p className="my-3 text-[13px] text-destructive">{t('dangerZone.subscription')}</p> : null}
          <Field>
            <FieldLabel htmlFor={inputId}>{t('dangerZone.confirmLabel')}</FieldLabel>
            <FieldDescription><Trans t={t} i18nKey="dangerZone.confirmHint" values={{ name: workspace.name }} components={{ strong: <strong /> }} /></FieldDescription>
            <Input id={inputId} autoComplete="off" required value={confirmation} readOnly={deletion.isPending} onChange={(event) => setConfirmation(event.target.value)} />
          </Field>
          {deletion.isError ? <p role="alert" className="my-3 text-[13px] text-destructive">{t('dangerZone.failed')}</p> : null}
          <DialogFooter className="mt-4">
            <DialogClose render={<Button type="button" variant="ghost" disabled={deletion.isPending} />}>{t('cancel')}</DialogClose>
            <Button type="submit" variant="destructive" className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50" disabled={confirmation !== workspace.name} aria-disabled={deletion.isPending || undefined}>{deletion.isPending ? t('dangerZone.deleting') : t('dangerZone.delete')}</Button>
          </DialogFooter>
        </form>
      </Modal>
    ) : null}
  </>
}
