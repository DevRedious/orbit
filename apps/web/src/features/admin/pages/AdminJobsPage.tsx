import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { JobLimitView } from '@orbit/api/generated/types.gen'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useJobLimits, useSaveJobLimits } from '@/features/admin/api'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

// `admin:jobs.kinds` keys of the job kinds Orbit names; another kind shows its id.
const KIND_LABELS = {
  'notion.scan': 'jobs.kinds.notionScan',
  'notion.import': 'jobs.kinds.notionImport',
  'workspace.export': 'jobs.kinds.workspaceExport',
} as const

const kindLabel = (kind: string) => (Object.hasOwn(KIND_LABELS, kind) ? KIND_LABELS[kind as keyof typeof KIND_LABELS] : null)

type Draft = Record<string, { concurrency: string; workspace_concurrency: string }>

const text = (limit: number | null | undefined) => (limit == null ? '' : String(limit))
const limit = (value: string) => (value.trim() === '' ? null : Number(value))
const shown = (limit: number | null | undefined) => (limit == null ? i18n.t('admin:jobs.unlimited') : String(limit))

function draftOf(kinds: JobLimitView[], useDefaults = false): Draft {
  return Object.fromEntries(kinds.map((kind) => [kind.kind, {
    concurrency: text(useDefaults ? kind.default_concurrency : kind.concurrency),
    workspace_concurrency: text(useDefaults ? kind.default_workspace_concurrency : kind.workspace_concurrency),
  }]))
}

/** How many background jobs of each kind may run at once, on all servers and per workspace. */
export function AdminJobsPage() {
  const { t } = useTranslation('admin')
  const limits = useJobLimits()
  if (limits.isPending) return <SettingsCard title={t('jobs.title')}><p role="status">{t('jobs.loading')}</p></SettingsCard>
  if (limits.isError) return <SettingsCard title={t('jobs.title')}><p role="alert">{t('jobs.failed')} <Button variant="ghost" onClick={() => void limits.refetch()}>{t('retry')}</Button></p></SettingsCard>
  // Remount on save so the form shows what the server stored.
  return <JobLimitsForm key={JSON.stringify(limits.data.kinds)} kinds={limits.data.kinds} />
}

function JobLimitsForm({ kinds }: { kinds: JobLimitView[] }) {
  const { t } = useTranslation('admin')
  const save = useSaveJobLimits()
  const [draft, setDraft] = useState(() => draftOf(kinds))
  const set = (kind: string, field: 'concurrency' | 'workspace_concurrency') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((current) => ({ ...current, [kind]: { ...current[kind], [field]: event.target.value } }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    save.mutate({
      kinds: kinds.map((kind) => ({
        kind: kind.kind,
        concurrency: limit(draft[kind.kind].concurrency),
        workspace_concurrency: limit(draft[kind.kind].workspace_concurrency),
      })),
    }, {
      onSuccess: () => toast(i18n.t('admin:jobs.saved')),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:jobs.saveFailed'))),
    })
  }

  return (
    <form onSubmit={submit}>
      <SettingsCard
        title={t('jobs.title')}
        description={t('jobs.description')}
        actions={(
          <>
            <Button type="button" variant="ghost" onClick={() => setDraft(draftOf(kinds, true))}>{t('jobs.reset')}</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? t('saving') : t('saveLimits')}</Button>
          </>
        )}
        flush
      >
        <div className="divide-y">
          {kinds.map((kind) => {
            const labelKey = kindLabel(kind.kind)
            const label = labelKey ? t(labelKey) : kind.kind
            return (
              <SettingsRow key={kind.kind}>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[13px]">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('jobs.defaults', { all: shown(kind.default_concurrency), workspace: shown(kind.default_workspace_concurrency) })}
                  </span>
                </div>
                <Field className="w-32">
                  <FieldLabel htmlFor={`${kind.kind}-concurrency`}>{t('jobs.allServers')}</FieldLabel>
                  <Input id={`${kind.kind}-concurrency`} aria-label={t('jobs.allServersLabel', { label })} type="number" min={1} max={100} placeholder={t('noLimit')} value={draft[kind.kind].concurrency} onChange={set(kind.kind, 'concurrency')} />
                </Field>
                <Field className="w-32">
                  <FieldLabel htmlFor={`${kind.kind}-workspace`}>{t('jobs.perWorkspace')}</FieldLabel>
                  <Input id={`${kind.kind}-workspace`} aria-label={t('jobs.perWorkspaceLabel', { label })} type="number" min={1} max={100} placeholder={t('noLimit')} value={draft[kind.kind].workspace_concurrency} onChange={set(kind.kind, 'workspace_concurrency')} />
                </Field>
              </SettingsRow>
            )
          })}
        </div>
      </SettingsCard>
    </form>
  )
}
