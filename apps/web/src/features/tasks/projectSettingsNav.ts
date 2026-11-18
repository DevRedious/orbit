import type { ComponentType } from 'react'
import { i18n } from '@/i18n'
import { Calendar, Category, Danger, DocumentText, Flag, Hierarchy, Link2, Lock, Setting2 as Settings, Tag } from 'reicon-react'

export type ProjectSettingsSection = 'general' | 'access' | 'statuses' | 'labels' | 'sub-issues' | 'milestones' | 'cycles' | 'docs' | 'github' | 'danger-zone'

export interface ProjectSettingsGroup {
  label: string
  items: { section: ProjectSettingsSection; label: string; icon: ComponentType<{ className?: string }> }[]
}

/** The project settings pages, grouped as the sidebar shows them. Labels are getters: they follow the UI language. */
export const PROJECT_SETTINGS_GROUPS: ProjectSettingsGroup[] = [
  {
    get label() { return i18n.t('tasks:detail.project') },
    items: [
      { section: 'general', get label() { return i18n.t('tasks:projectSettings.general') }, icon: Settings },
      { section: 'access', get label() { return i18n.t('tasks:access.title') }, icon: Lock },
    ],
  },
  {
    get label() { return i18n.t('tasks:settingsNav.workflow') },
    items: [
      { section: 'statuses', get label() { return i18n.t('tasks:projectSettings.statuses') }, icon: Category },
      { section: 'labels', get label() { return i18n.t('tasks:labels.title') }, icon: Tag },
      { section: 'sub-issues', get label() { return i18n.t('tasks:subIssues.title') }, icon: Hierarchy },
    ],
  },
  {
    get label() { return i18n.t('tasks:settingsNav.planning') },
    items: [
      { section: 'milestones', get label() { return i18n.t('tasks:milestones.title') }, icon: Flag },
      { section: 'cycles', get label() { return i18n.t('tasks:cycles.title') }, icon: Calendar },
    ],
  },
  {
    get label() { return i18n.t('tasks:settingsNav.integrations') },
    items: [
      { section: 'docs', get label() { return i18n.t('tasks:docs.title') }, icon: DocumentText },
      { section: 'github', label: 'GitHub', icon: Link2 },
    ],
  },
  {
    get label() { return i18n.t('tasks:settingsNav.advanced') },
    items: [{ section: 'danger-zone', get label() { return i18n.t('tasks:projectSettings.dangerZone') }, icon: Danger }],
  },
]

const ITEMS = PROJECT_SETTINGS_GROUPS.flatMap((group) => group.items)

/** The page of a `:section` route segment; an unknown one is `null`. */
export function projectSettingsItem(section: string) {
  return ITEMS.find((item) => item.section === section) ?? null
}

export function projectSettingsPath(projectId: string, section: ProjectSettingsSection): string {
  return `/tasks/projects/${projectId}/settings/${section}`
}

/** The project whose settings the path opens. */
export function projectSettingsProjectOf(pathname: string): string | null {
  return /^\/tasks\/projects\/([^/]+)\/settings(\/|$)/.exec(pathname)?.[1] ?? null
}
