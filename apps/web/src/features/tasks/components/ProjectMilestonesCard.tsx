import { useTranslation } from 'react-i18next'
import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, MoreH as MoreHorizontal, Edit as Pencil, Trash as Trash2 } from 'reicon-react'
import { confirmAction } from '@/components/common/confirmAction'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Tip } from '@/components/common/Tip'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { LoadingText } from '@/components/ui/spinner'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import type { Milestone } from '@/features/tasks/api/models'
import { useCreateMilestone, useDeleteMilestone, useMilestones, useReorderMilestones, useUpdateMilestone } from '@/features/tasks/api/milestones'
import { isMilestoneLate, planningProgress, targetDateInput, targetDateValue, targetLabel } from '@/features/tasks/planningLib'
import { useWorkspace } from '@/features/workspaces/workspaceContext'

type MilestoneValues = { name: string; description: string | null; target_at: string | null }

function MilestoneForm({ initial, submitLabel, pending, onSubmit, onCancel }: { initial?: Milestone; submitLabel: string; pending: boolean; onSubmit: (values: MilestoneValues) => Promise<void>; onCancel?: () => void }) {
  const { t } = useTranslation('tasks')
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [target, setTarget] = useState(targetDateInput(initial?.target_at ?? null))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || pending) return
    try {
      await onSubmit({ name: trimmed, description: description.trim() || null, target_at: targetDateValue(target) })
      if (!initial) {
        setName('')
        setDescription('')
        setTarget('')
      }
    } catch {
      // The card shows the mutation error.
    }
  }
  return (
    <form className="flex w-full flex-wrap items-center gap-3" onSubmit={(event) => void submit(event)} onKeyDown={(event) => { if (event.key === 'Escape') onCancel?.() }}>
      <Input className="w-full max-w-[220px]" aria-label={t('milestones.name')} placeholder={t('milestones.name')} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} autoFocus={Boolean(initial)} />
      <Input className="w-auto" type="date" aria-label={t('milestones.targetDate')} value={target} onChange={(event) => setTarget(event.target.value)} />
      <Input className="min-w-40 flex-1" aria-label={t('text.description')} placeholder={t('projectSettings.descriptionPlaceholder')} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="flex gap-2">
        <Button type="submit" disabled={!name.trim() || pending}>{submitLabel}</Button>
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>{t('cancel')}</Button> : null}
      </div>
    </form>
  )
}

/** The project's milestones in their order: create, edit, reorder and delete, with each one's progress. */
export function ProjectMilestonesCard({ projectId }: { projectId: string }) {
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const milestones = useMilestones(workspace.id, projectId)
  const createMilestone = useCreateMilestone(workspace.id, projectId)
  const updateMilestone = useUpdateMilestone(workspace.id, projectId)
  const deleteMilestone = useDeleteMilestone(workspace.id, projectId)
  const reorderMilestones = useReorderMilestones(workspace.id, projectId)
  const [editingId, setEditingId] = useState<string>()
  const list = milestones.data ?? []

  const move = (index: number, by: -1 | 1) => {
    const ordered = [...list]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(index + by, 0, moved!)
    reorderMilestones.mutate(ordered.map((milestone, position) => ({ id: milestone.id, expected_version: milestone.version, position })))
  }
  const remove = async (milestone: Milestone) => {
    if (!await confirmAction({ title: t('milestones.deleteTitle', { name: milestone.name }), description: t('milestones.deleteDescription'), confirmLabel: t('delete'), danger: true })) return
    deleteMilestone.mutate(milestone)
  }

  return (
    <SettingsCard title={t('milestones.title')} description={t('milestones.description')} flush>
      <div className="flex flex-col divide-y">
        <SettingsRow>
          <MilestoneForm submitLabel={t('milestones.create')} pending={createMilestone.isPending} onSubmit={async (values) => { await createMilestone.mutateAsync(values) }} />
        </SettingsRow>
        {createMilestone.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{t('milestones.createFailed')}</SettingsRow> : null}
        {milestones.isPending ? <SettingsRow><LoadingText>{t('milestones.loading')}</LoadingText></SettingsRow> : null}
        {milestones.isError ? <SettingsRow role="alert">{t('milestones.loadFailed')}</SettingsRow> : null}
        {milestones.isSuccess && list.length === 0 ? <SettingsRow>{t('milestones.empty')}</SettingsRow> : null}
        {list.map((milestone, index) => editingId === milestone.id
          ? <SettingsRow key={milestone.id}>
              <MilestoneForm
                initial={milestone}
                submitLabel={t('save')}
                pending={updateMilestone.isPending}
                onCancel={() => setEditingId(undefined)}
                onSubmit={async (values) => {
                  await updateMilestone.mutateAsync({ milestoneId: milestone.id, body: { ...values, expected_version: milestone.version } })
                  setEditingId(undefined)
                }}
              />
            </SettingsRow>
          : <SettingsRow key={milestone.id} className="group/row flex-nowrap">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {milestone.name}
                  {milestone.target_at ? <span className="font-normal text-muted-foreground"> · {targetLabel(milestone.target_at)}</span> : null}
                  {isMilestoneLate(milestone) ? <span className="font-normal text-destructive"> · {t('milestones.late')}</span> : null}
                </span>
                {milestone.description ? <span className="truncate text-xs text-muted-foreground/70">{milestone.description}</span> : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{planningProgress(milestone)}</span>
              <DropdownMenu>
                <Tip label={t('projectSettings.actions')}>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" className="size-[30px] rounded-full bg-muted transition-opacity duration-150 ease-out focus-visible:opacity-100 aria-expanded:opacity-100 hover-fine:opacity-0 hover-fine:group-hover/row:opacity-100" aria-label={t('milestones.actions', { name: milestone.name })}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    }
                  />
                </Tip>
                <DropdownMenuContent align="end" className="w-auto min-w-45">
                  <DropdownMenuItem onClick={() => { updateMilestone.reset(); setEditingId(milestone.id) }}>
                    <Pencil className="size-3.5" />
                    {t('edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={index === 0 || reorderMilestones.isPending} onClick={() => move(index, -1)}>
                    <ArrowUp className="size-3.5" />
                    {t('milestones.moveUp')}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={index === list.length - 1 || reorderMilestones.isPending} onClick={() => move(index, 1)}>
                    <ArrowDown className="size-3.5" />
                    {t('milestones.moveDown')}
                  </DropdownMenuItem>
                  {/* data-danger (not variant="destructive"): the menu popup forces destructive items to the accent colour */}
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive *:[svg]:text-destructive" data-danger="true" disabled={deleteMilestone.isPending} onClick={() => void remove(milestone)}>
                    <Trash2 className="size-3.5" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SettingsRow>)}
        {updateMilestone.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{t('milestones.saveFailed')}</SettingsRow> : null}
        {reorderMilestones.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{t('milestones.reorderFailed')}</SettingsRow> : null}
        {deleteMilestone.isError ? <SettingsRow className="text-xs text-destructive" role="alert">{t('milestones.deleteFailed')}</SettingsRow> : null}
      </div>
    </SettingsCard>
  )
}
