import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UnsavedBar } from '@/components/common/UnsavedBar'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuthOptions } from '@/features/auth/api'
import { useRenameWorkspace } from '@/features/workspaces/api'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { SettingsCard } from '@/components/common/SettingsCard'
import { FieldGrid } from '@/features/settings/components/SettingsParts'
import { WorkspaceLeave } from '@/features/settings/components/WorkspaceLeave'
import { useSlowPending } from '@/lib/useDebouncedValue'

export function GeneralPage() {
  const { t } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const renameWorkspace = useRenameWorkspace(workspace.id)
  const renameSlow = useSlowPending(renameWorkspace.isPending)
  const canRename = useCan('workspace.update')
  const version = useAuthOptions().data?.version
  const formRef = useRef<HTMLFormElement>(null)
  const [nameDraft, setNameDraft] = useState<{ workspaceId: string; value: string } | null>(null)
  const name = nameDraft?.workspaceId === workspace.id ? nameDraft.value : workspace.name
  const dirty = name.trim() !== workspace.name

  function saveWorkspace() {
    if (!name.trim() || !dirty || renameWorkspace.isPending) return
    renameWorkspace.mutate(
      { name: name.trim(), version: workspace.version },
      { onSuccess: () => setNameDraft(null) },
    )
  }

  return (
    <>
      {canRename ? <SettingsCard title={t('general.title')}>
        <form ref={formRef} onSubmit={(event) => { event.preventDefault(); saveWorkspace() }}>
          <FieldGrid>
            <Field><FieldLabel htmlFor="workspace-name">{t('general.name')}</FieldLabel><Input id="workspace-name" required disabled={renameSlow} value={name} onChange={(event) => setNameDraft({ workspaceId: workspace.id, value: event.target.value })} /></Field>
          </FieldGrid>
        </form>
        {renameWorkspace.isError ? <p role="alert" className="text-destructive">{t('general.renameFailed')} <Button variant="ghost" onClick={saveWorkspace}>{t('retry')}</Button></p> : null}
        {renameSlow ? <p role="status">{t('general.saving')}</p> : null}
      </SettingsCard> : null}

      <WorkspaceLeave key={workspace.id} />
      {version ? <p className="text-center text-xs text-muted-foreground tabular-nums">{t('general.version', { version })}</p> : null}
      {dirty ? (
        <UnsavedBar
          onReset={() => { if (renameWorkspace.isPending) return; setNameDraft(null); renameWorkspace.reset() }}
          onSave={() => formRef.current?.requestSubmit()}
          saving={renameWorkspace.isPending}
        />
      ) : null}
    </>
  )
}
