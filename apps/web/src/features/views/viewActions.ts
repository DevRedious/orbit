import { toast } from 'sonner'
import { confirmAction } from '@/components/common/confirmAction'
import { switchWorkspaceHref } from '@/features/workspaces/navigation'
import { i18n } from '@/i18n'
import type { SavedView } from './api/views'

export function viewPath(viewId: string): string {
  return `/views/${viewId}`
}

/** Copies the view's URL with its workspace, so the link opens in the right workspace. */
export async function copyViewLink(workspaceId: string, viewId: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${switchWorkspaceHref(viewPath(viewId), '', workspaceId)}`)
    toast(i18n.t('views:actions.linkCopied'))
  } catch {
    toast.error(i18n.t('views:actions.copyFailed'))
  }
}

export function confirmDeleteView(view: Pick<SavedView, 'name' | 'visibility'>): Promise<boolean> {
  return confirmAction({
    title: i18n.t('views:actions.deleteTitle'),
    description: view.visibility === 'workspace' ? i18n.t('views:actions.deleteDescriptionWorkspace', { name: view.name }) : i18n.t('views:actions.deleteDescription', { name: view.name }),
    confirmLabel: i18n.t('views:actions.deleteView'),
    danger: true,
  })
}
