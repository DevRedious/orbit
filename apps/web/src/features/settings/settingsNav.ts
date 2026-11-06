import { useContext, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { ArchiveBox, Brush, Card, Chart, ClipboardText, CloudConnection, Cpu, SecurityUser, Driver, Key, Keyboard, Link2, Lock, Login, Notification as Bell, Setting2 as Settings, ShieldTick as ShieldCheck, SmileCircle, Sms as Mail, Sticker, Danger as TriangleAlert, DocumentDownload, Import, User, People as Users } from 'reicon-react'
import type { Permission } from '@orbit/api/generated/types.gen'
import { RobotIcon } from '@/components/common/icons/RobotIcon'
import { WorkspaceContext } from '@/features/workspaces/workspaceContext'
import { useBillingEnabled } from '@/features/workspaces/billing'

export interface SettingsNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
  /** Shown only to roles that hold this permission. */
  permission?: Permission
  /** Shown only in Orbit Cloud (billing on). */
  cloud?: boolean
}

export interface SettingsNavSection {
  label: string
  items: SettingsNavItem[]
}

export type SettingsAreaName = 'settings' | 'profile' | 'admin'

interface SettingsArea {
  title: string
  icon: SettingsNavItem['icon']
  sections: SettingsNavSection[]
}

/** The areas as catalog keys; `useSettingsArea` translates them at render, so they follow a language change. */
type SettingsKey = ParseKeys<'settings'>
type AreaDef = Omit<SettingsArea, 'title' | 'sections'> & {
  title: SettingsKey
  sections: Array<{ label: SettingsKey; items: Array<Omit<SettingsNavItem, 'label'> & { label: SettingsKey }> }>
}

const AREAS: Record<SettingsAreaName, AreaDef> = {
  /** The workspace's settings. */
  settings: {
    title: 'nav.areas.settings',
    icon: Settings,
    sections: [
      {
        label: 'nav.sections.workspace',
        items: [
          { to: '/settings', label: 'nav.items.general', icon: Settings, end: true },
          { to: '/settings/members', label: 'nav.items.members', icon: Users },
          { to: '/settings/billing', label: 'nav.items.billing', icon: Card, cloud: true },
        ],
      },
      {
        label: 'nav.sections.chat',
        items: [
          { to: '/settings/emoji', label: 'nav.items.emoji', icon: SmileCircle, permission: 'chat.manage' },
          { to: '/settings/stickers', label: 'nav.items.stickers', icon: Sticker, permission: 'chat.manage' },
        ],
      },
      {
        label: 'nav.sections.integrations',
        items: [
          { to: '/settings/file-storage', label: 'nav.items.fileStorage', icon: CloudConnection },
          { to: '/settings/github', label: 'nav.items.github', icon: Link2 },
          { to: '/settings/agentic', label: 'nav.items.agentic', icon: RobotIcon },
          { to: '/settings/api-tokens', label: 'nav.items.apiTokens', icon: Key, permission: 'api_tokens.manage' },
        ],
      },
      {
        label: 'nav.sections.advanced',
        items: [
          { to: '/settings/import', label: 'nav.items.import', icon: Import },
          { to: '/settings/export', label: 'nav.items.export', icon: DocumentDownload, permission: 'workspace.export' },
          { to: '/settings/danger-zone', label: 'nav.items.dangerZone', icon: TriangleAlert, permission: 'workspace.delete' },
        ],
      },
    ],
  },
  /** What belongs to the signed-in person, in every workspace. */
  profile: {
    title: 'nav.areas.profile',
    icon: User,
    sections: [
      {
        label: 'nav.sections.account',
        items: [
          { to: '/profile', label: 'nav.items.profile', icon: User, end: true },
          { to: '/profile/security', label: 'nav.items.security', icon: Lock },
          { to: '/profile/sessions', label: 'nav.items.sessions', icon: ShieldCheck },
        ],
      },
      {
        label: 'nav.sections.preferences',
        items: [
          { to: '/profile/appearance', label: 'nav.items.appearance', icon: Brush },
          { to: '/profile/notifications', label: 'nav.items.notifications', icon: Bell },
          { to: '/profile/shortcuts', label: 'nav.items.shortcuts', icon: Keyboard },
        ],
      },
      {
        label: 'nav.sections.advanced',
        items: [
          { to: '/profile/agentic', label: 'nav.items.agentic', icon: RobotIcon },
          { to: '/profile/storage', label: 'nav.items.storage', icon: Driver },
        ],
      },
    ],
  },
  /** What belongs to the whole Orbit instance. Only the root user (the account created at setup) sees it. */
  admin: {
    title: 'nav.areas.admin',
    icon: SecurityUser,
    sections: [
      {
        label: 'nav.sections.instance',
        items: [
          { to: '/admin', label: 'nav.items.general', icon: Settings, end: true },
          { to: '/admin/users', label: 'nav.items.users', icon: Users },
          { to: '/admin/email', label: 'nav.items.email', icon: Mail },
          { to: '/admin/sign-in-providers', label: 'nav.items.signInProviders', icon: Login },
          { to: '/admin/limits', label: 'nav.items.limits', icon: Chart },
        ],
      },
      {
        label: 'nav.sections.data',
        items: [
          { to: '/admin/storage', label: 'nav.items.storage', icon: CloudConnection },
          { to: '/admin/backups', label: 'nav.items.backups', icon: ArchiveBox },
        ],
      },
      {
        label: 'nav.sections.monitoring',
        items: [
          { to: '/admin/audit', label: 'nav.items.auditLog', icon: ClipboardText },
          { to: '/admin/jobs', label: 'nav.items.jobs', icon: Cpu },
        ],
      },
    ],
  },
}

const under = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

/** The settings area a route belongs to; the sidebar shows that area's links instead of the app links. */
export function settingsAreaOf(pathname: string): SettingsAreaName | null {
  if (under(pathname, '/settings')) return 'settings'
  if (under(pathname, '/profile')) return 'profile'
  if (under(pathname, '/admin')) return 'admin'
  return null
}

/** An area's title, icon and the links this person may open. */
/** `profileOnly`: just the Profile page, all that someone with no workspace who is not an operator may open. */
export function useSettingsArea(name: SettingsAreaName, profileOnly = false): SettingsArea {
  const { t } = useTranslation('settings')
  const permissions = useContext(WorkspaceContext)?.workspace.permissions ?? []
  const cloud = useBillingEnabled()
  const area = AREAS[name]
  const sections = area.sections
    .map((section) => ({
      label: t(section.label),
      items: section.items
        .filter((item) => (!item.permission || permissions.includes(item.permission)) && (!item.cloud || cloud) && (!profileOnly || item.to === '/profile'))
        .map((item) => ({ ...item, label: t(item.label) })),
    }))
    .filter((section) => section.items.length > 0)
  return { ...area, title: t(area.title), sections }
}
