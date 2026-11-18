import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Trans, useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown } from 'reicon-react'
import { selectTriggerClassName } from '@/components/ui/select'
import { SearchPicker } from '@/components/common/SearchPicker'
import { InfoTip } from '@/components/common/InfoTip'
import { SettingsCard } from '@/components/common/SettingsCard'
import { UnsavedBar } from '@/components/common/UnsavedBar'
import { useDeleteGithubProjectConnection, useGithubProjectSettings, useSaveGithubProjectConnection } from '@/features/tasks/api/github'
import { loadFailed } from '@/lib/connection'
import { problemMessage } from '@/i18n/problem'

/** A server problem in the UI language when the catalog knows it; another error keeps its own message. */
const githubSaveError = (error: unknown, fallback: string) => problemMessage(error, error instanceof Error && error.message ? error.message : fallback)

export type PendingProjectSave = { reset: () => void; save: () => void; saving: boolean }

export function ProjectGithubCard({ workspaceId, projectId, onPendingChange }: {
  workspaceId: string
  projectId: string
  onPendingChange?: (pending: PendingProjectSave | null) => void
}) {
  const { t } = useTranslation('tasks')
  const query = useGithubProjectSettings(workspaceId, projectId)
  const save = useSaveGithubProjectConnection(workspaceId, projectId)
  const remove = useDeleteGithubProjectConnection(workspaceId, projectId)

  if (loadFailed(query)) return <SettingsCard title="GitHub">{t('github.unavailable')}</SettingsCard>
  if (query.data === undefined) return <SettingsCard title="GitHub">{t('github.loading')}</SettingsCard>

  return <GithubCardContent
    key={`${projectId}:${query.data.repository}:${query.data.label}`}
    settings={query.data}
    workspaceId={workspaceId}
    save={save}
    remove={remove}
    onPendingChange={onPendingChange}
  />
}

type Settings = NonNullable<ReturnType<typeof useGithubProjectSettings>['data']>
type Save = ReturnType<typeof useSaveGithubProjectConnection>
type Remove = ReturnType<typeof useDeleteGithubProjectConnection>
const NO_REPOSITORY = 'none'

function GithubCardContent({ settings, workspaceId, save, remove, onPendingChange }: {
  settings: Settings
  workspaceId: string
  save: Save
  remove: Remove
  onPendingChange?: (pending: PendingProjectSave | null) => void
}) {
  const { t } = useTranslation('tasks')
  const current = settings.repositories.find((item) => item.repository === settings.repository)
  const savedSelection = current ? `${current.installation_id}:${current.repository}` : NO_REPOSITORY
  const savedLabel = settings.label ?? 'Orbit'
  const [selection, setSelection] = useState(savedSelection)
  const [label, setLabel] = useState(savedLabel)
  const selected = settings.repositories.find((item) => `${item.installation_id}:${item.repository}` === selection)
  const disconnecting = selection === NO_REPOSITORY && !!settings.repository
  const dirty = selection !== savedSelection || label !== savedLabel
  const repositoryOptions = [
    { value: NO_REPOSITORY, label: t('github.noRepository') },
    ...settings.repositories.map((item) => ({ value: `${item.installation_id}:${item.repository}`, label: item.repository })),
  ]
  const saveConnection = save.mutate
  const removeConnection = remove.mutate
  const saving = save.isPending || remove.isPending || (!disconnecting && (!selected || !label.trim()))
  const reset = useCallback(() => { setSelection(savedSelection); setLabel(savedLabel) }, [savedSelection, savedLabel])
  const saveChanges = useCallback(() => {
    if (disconnecting) removeConnection()
    else if (selected && label.trim()) saveConnection({ installation_id: selected.installation_id, repository: selected.repository, label: label.trim() })
  }, [disconnecting, removeConnection, selected, label, saveConnection])

  useEffect(() => {
    onPendingChange?.(dirty ? { reset, save: saveChanges, saving } : null)
    return () => onPendingChange?.(null)
  }, [dirty, saving, reset, saveChanges, onPendingChange])

  return <><SettingsCard title="GitHub" description={t('github.description')}>
    <div className="flex flex-col gap-4">
      {!settings.app_slug ? (
        <p className="text-sm text-muted-foreground"><Trans t={t} i18nKey="github.setUpApp" components={{ settingsLink: <Link className="text-primary underline" to={`/settings/github?workspace=${workspaceId}`} /> }} /></p>
      ) : (
        <>
          {settings.repositories.length === 0 ? <p className="text-sm text-muted-foreground"><Trans t={t} i18nKey="github.installApp" components={{ settingsLink: <Link className="text-primary underline" to={`/settings/github?workspace=${workspaceId}`} /> }} /></p> : null}
          {settings.can_manage ? <>
            <div className="grid gap-1.5">
              <Label htmlFor="github-repository">{t('github.repository')}</Label>
              <SearchPicker
                label={t('github.repository')}
                placeholder={t('github.searchRepositories')}
                emptyText={t('github.noRepositoriesMatch')}
                options={repositoryOptions}
                selected={[selection]}
                onSelect={setSelection}
                className="w-(--anchor-width) min-w-60"
                trigger={
                  <button type="button" id="github-repository" data-size="default" className={selectTriggerClassName}>
                    <span data-slot="select-value" className="flex flex-1 text-left">{repositoryOptions.find((item) => item.value === selection)?.label ?? t('github.noRepository')}</span>
                    <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="github-label">
                {t('github.issueLabel')}
                <InfoTip text={t('github.issueLabelHint')} />
              </Label>
              <Input id="github-label" maxLength={50} value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            {save.isError || remove.isError ? <p role="alert" className="text-xs text-destructive">{githubSaveError(save.error instanceof Error ? save.error : remove.error, t('github.saveFailed'))}</p> : null}
          </> : null}
          {!settings.can_manage && settings.repository ? <p className="text-sm text-muted-foreground">{t('github.connected', { repository: settings.repository, label: settings.label ?? '' })}</p> : null}
        </>
      )}
    </div>
  </SettingsCard>
    {!onPendingChange && settings.can_manage && dirty ? <UnsavedBar onReset={reset} onSave={saveChanges} saving={saving} /> : null}
  </>
}
