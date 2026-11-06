import { toast } from 'sonner'
import { confirmAction } from '@/components/common/confirmAction'
import type { Task } from '@/features/tasks/api/models'
import { useDeleteTask } from '@/features/tasks/api/tasks'
import { i18n } from '@/i18n'

/** Moves tasks to trash after a confirmation. Resolves to false when the user cancels. */
export function useTrashTasks(workspaceId: string) {
  const deleteTask = useDeleteTask(workspaceId)
  return async (tasks: Task[]): Promise<boolean> => {
    const title = tasks.length === 1 ? i18n.t('tasks:trash.moveOneTitle', { identifier: tasks[0].identifier }) : i18n.t('tasks:trash.moveManyTitle', { count: tasks.length })
    if (!await confirmAction({ title, description: i18n.t('tasks:trash.moveDescription'), confirmLabel: i18n.t('tasks:trash.move'), danger: true })) return false
    const results = await Promise.allSettled(tasks.map((task) => deleteTask.mutateAsync({ taskId: task.id, version: task.version })))
    const failed = results.filter((result) => result.status === 'rejected').length
    if (failed > 0) toast.error(i18n.t('tasks:trash.moveFailed', { count: failed, total: tasks.length }))
    return true
  }
}
