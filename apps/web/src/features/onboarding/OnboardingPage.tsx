import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { Check } from 'reicon-react'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { cn } from 'cn'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AuthBrand, AuthCard } from '@/features/auth/components/AuthForm'
import { useProjects, useUpdateProject } from '@/features/tasks/api/projects'
import type { Project } from '@/features/tasks/api/models'
import { PROJECT_COLORS } from '@/features/tasks/taskMeta'
import { useCreateWorkspace, useWorkspaces } from '@/features/workspaces/api'
import { useIsInstallationAdmin } from '@/features/workspaces/permissions'
import { problemMessage } from '@/i18n/problem'

/** The tag a project name suggests: its first three letters or digits, upper case. */
function suggestedProjectKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
}

/**
 * What a person without a workspace sees after sign-in (the root user right after setup, too): first the workspace,
 * then the workspace's first project. Every new workspace starts with a "General" project and its workflow, so the
 * second step names and colours that project instead of making another one.
 */
export function OnboardingPage() {
  const workspaces = useWorkspaces()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  if (workspaceId) return <ProjectStep workspaceId={workspaceId} />
  // Someone who already has a workspace has nothing to set up here.
  if (workspaces.data && workspaces.data.length > 0) return <Navigate to="/tasks" replace />
  return <WorkspaceStep onCreated={setWorkspaceId} />
}

function StepHeader({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  const { t } = useTranslation('shell')
  return (
    <>
      <AuthBrand />
      <p className="mt-4 text-xs font-medium text-muted-foreground">{t('onboarding.step', { step })}</p>
      <h1 className="mt-1 mb-2">{title}</h1>
      <div className="grid gap-2 text-[13px] leading-[1.6] text-muted-foreground">{children}</div>
    </>
  )
}

function WorkspaceStep({ onCreated }: { onCreated: (workspaceId: string) => void }) {
  const { t } = useTranslation('shell')
  const createWorkspace = useCreateWorkspace()
  const isOperator = useIsInstallationAdmin()
  const [name, setName] = useState('')
  return (
    <AuthCard>
      <form className="grid gap-[18px]" onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim() || createWorkspace.isPending) return
        createWorkspace.mutate(name.trim(), { onSuccess: (workspace) => onCreated(workspace.id) })
      }}>
        <StepHeader step={1} title={t('onboarding.workspace.title')}>
          <p>{t('onboarding.workspace.intro')}</p>
          <p>{t('onboarding.workspace.later')}</p>
        </StepHeader>
        <Field>
          <FieldLabel htmlFor="onboarding-workspace">{t('onboarding.workspace.name')}</FieldLabel>
          <Input id="onboarding-workspace" required autoFocus placeholder={t('onboarding.workspace.namePlaceholder')} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        {createWorkspace.isError ? <p role="alert" className="text-[13px] text-destructive">{problemMessage(createWorkspace.error, t('onboarding.workspace.createFailed'))}</p> : null}
        <Button type="submit" disabled={createWorkspace.isPending || !name.trim()}>{createWorkspace.isPending ? t('onboarding.pleaseWait') : t('onboarding.workspace.create')}</Button>
        {/* Admin and the account settings work without a workspace: there, a person can also delete their account. */}
        {isOperator
          ? <Link to="/admin" className={cn(buttonVariants({ variant: 'ghost' }), '-mt-2')}>{t('onboarding.workspace.backToAdmin')}</Link>
          : <Link to="/profile" className={cn(buttonVariants({ variant: 'ghost' }), '-mt-2')}>{t('onboarding.workspace.accountSettings')}</Link>}
      </form>
    </AuthCard>
  )
}

function ProjectStep({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation(['shell', 'common'])
  const projects = useProjects(workspaceId)
  const project = projects.data?.[0]
  if (projects.isError) {
    return (
      <AuthCard>
        <StepHeader step={2} title={t('onboarding.project.title')}><p role="alert">{t('onboarding.project.loadFailed')}</p></StepHeader>
        <Button className="mt-4 w-full" onClick={() => void projects.refetch()}>{t('common:retry')}</Button>
      </AuthCard>
    )
  }
  if (!project) return <AuthCard><p role="status" className="text-[13px] text-muted-foreground">{t('onboarding.project.loading')}</p></AuthCard>
  return <ProjectForm workspaceId={workspaceId} project={project} />
}

function ProjectForm({ workspaceId, project }: { workspaceId: string; project: Project }) {
  const { t } = useTranslation('shell')
  const navigate = useNavigate()
  const updateProject = useUpdateProject(workspaceId, project.id)
  const [draft, setDraft] = useState({ name: '', key: '', color: project.color })
  // The tag follows the name until the person edits it.
  const [keyEdited, setKeyEdited] = useState(false)
  const name = draft.name.trim()
  const key = draft.key
  const finish = () => navigate(`/tasks?workspace=${encodeURIComponent(workspaceId)}&project=${encodeURIComponent(project.id)}`, { replace: true })
  return (
    <AuthCard>
      <form className="grid gap-[18px]" onSubmit={(event) => {
        event.preventDefault()
        if (!name || !key || updateProject.isPending) return
        updateProject.mutate({ name, key, color: draft.color, expected_version: project.version }, { onSuccess: finish })
      }}>
        <StepHeader step={2} title={t('onboarding.project.title')}>
          <p>
            <Trans t={t} i18nKey="onboarding.project.intro" values={{ key: key || 'WEB' }} components={{ tag: <span className="font-mono text-foreground" /> }} />
          </p>
          <p>{t('onboarding.project.workflow')}</p>
        </StepHeader>
        <Field>
          <FieldLabel htmlFor="onboarding-project">{t('onboarding.project.name')}</FieldLabel>
          <Input id="onboarding-project" required autoFocus placeholder={t('onboarding.project.namePlaceholder')} value={draft.name} onChange={(event) => {
            const value = event.target.value
            setDraft((current) => ({ ...current, name: value, key: keyEdited ? current.key : suggestedProjectKey(value) }))
          }} />
        </Field>
        <Field>
          <FieldLabel htmlFor="onboarding-project-key">{t('onboarding.project.tag')}</FieldLabel>
          <Input id="onboarding-project-key" required maxLength={5} placeholder="WEB" value={draft.key} onChange={(event) => {
            setKeyEdited(true)
            setDraft((current) => ({ ...current, key: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))
          }} />
        </Field>
        <div className="grid gap-2">
          <span className="text-sm font-medium">{t('onboarding.project.color')}</span>
          <div className="flex flex-wrap gap-2">
            {PROJECT_COLORS.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                size="sm"
                title={color}
                aria-label={t('onboarding.project.colorOption', { color })}
                aria-pressed={draft.color.toLowerCase() === color}
                onClick={() => setDraft((current) => ({ ...current, color }))}
              >
                {draft.color.toLowerCase() === color ? <Check className="size-3" /> : null}
              </ColorSwatch>
            ))}
          </div>
        </div>
        {updateProject.isError ? <p role="alert" className="text-[13px] text-destructive">{problemMessage(updateProject.error, t('onboarding.project.saveFailed'))}</p> : null}
        <Button type="submit" disabled={updateProject.isPending || !name || !key}>{updateProject.isPending ? t('onboarding.pleaseWait') : t('onboarding.project.create')}</Button>
        <Button type="button" variant="ghost" onClick={finish}>{t('onboarding.project.skip', { name: project.name })}</Button>
      </form>
    </AuthCard>
  )
}
