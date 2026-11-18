import { useTranslation } from 'react-i18next'
import { SearchPicker } from '@/components/common/SearchPicker'
import { Button } from '@/components/ui/button'
import type { Project, Task } from '@/features/tasks/api/models'
import { useMoveToProject } from '@/features/tasks/useMoveToProject'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { projectOption } from './pickerOptions'
import { ProjectChip } from './TaskPropertyChips'

/**
 * Project chip that opens a searchable list to move the task to another project in place. The task gets the new project's next
 * number; a task the server keeps in its project (synced with GitHub) stays, with a toast that says why.
 */
export function ProjectPicker({ task, projects, className }: { task: Pick<Task, 'id' | 'version' | 'projectId'>; projects: Project[]; className?: string }) {
  const { t } = useTranslation('tasks')
  const { workspace } = useWorkspace()
  const moveToProject = useMoveToProject(workspace.id)
  const project = projects.find((item) => item.id === task.projectId)
  if (projects.length < 2) return <ProjectChip project={project} className={className} />
  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <SearchPicker
        label={t('project.move')}
        tip={t('project.move')}
        placeholder={t('search.moveToProject')}
        emptyText={t('search.noProjects')}
        options={projects.map(projectOption)}
        selected={[task.projectId]}
        onSelect={(id) => {
          const target = projects.find((item) => item.id === id)
          if (target && id !== task.projectId) moveToProject([task], target)
        }}
        trigger={
          <Button type="button" variant="link" className="h-auto min-w-0 p-0 text-[length:inherit] font-normal" aria-label={project ? t('project.current', { name: project.name }) : t('project.currentNone')}>
            <ProjectChip project={project} className="hover:text-foreground" />
          </Button>
        }
      />
    </div>
  )
}
