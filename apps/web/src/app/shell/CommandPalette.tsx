import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { cn } from 'cn'
import { useAppSidebarTheme } from '@/lib/customTheme'
import { DocumentText as FileText, Hashtag, Home2 as Home, Message as MessageSquare, Notification as Bell, People as Users, Setting2 as Settings, ShieldTick as ShieldCheck, Sms as Mail, TaskSquare as SquareCheck, Trash as Trash2, User as Person } from 'reicon-react'
import type { IconComponent as LucideIcon } from 'reicon-react'
import { RobotIcon } from '@/components/common/icons/RobotIcon'
import { Emoji } from '@/components/common/Emoji'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import type { TextRange } from '@orbit/api/generated/types.gen'
import { queryKeys } from '@/api/queryKeys'
import { chatKeys } from '@/features/chat/api/keys'
import type { Conversation } from '@/features/chat/api/types'
import { conversationPath } from '@/features/chat/chatRoutes'
import { conversationTitle } from '@/features/chat/lib/sidebar'
import type { User } from '@/features/workspaces/models'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { TaskStatusIcon } from '@/features/tasks/components/TaskStatusIcon'
import { useTaskReferences, type TaskReference } from '@/features/tasks/taskReferences'
import { usePageSearch } from '@/features/docs/api/pages'
import { useRecentPages } from '@/features/docs/api/pageOptions'
import { useTeamspaces } from '@/features/docs/api/teamspaces'
import { pageTitle, spaceKey, spaceLabel } from '@/features/docs/pageTree'
import { highlightSegments } from '@/features/docs/searchHighlights'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { commandGroupLabel, commandTitle } from '@/shortcuts/commandText'
import type { CommandId, Group } from '@/shortcuts/commands'
import { ShortcutKeys } from '@/shortcuts/Shortcut'
import { useAvailableCommands, useBindings, useRunCommand } from '@/shortcuts/useCommand'
import { useMailEnabled } from '@/features/mail/enabled'
import { chatEnabled, docsHidden } from './productNavigation'
import { namesDestination, paletteArea, sectionOrder, type PaletteArea, type PaletteSection } from './paletteOrder'

const COMMAND_ICON: Record<Group, LucideIcon> = { General: Settings, Navigation: Home, List: SquareCheck, Task: SquareCheck, Docs: FileText, Chat: MessageSquare, Mail }

type EntryKind = 'navigation' | 'command' | 'task' | 'page' | 'chat'

interface CommandEntry {
  id: string
  kind: EntryKind
  icon: LucideIcon
  title: string
  meta: string
  /** A navigation entry's destination ("Settings" for "Go to Settings"): a query that names it puts navigation first. */
  name?: string
  /** The group of a command entry. */
  group?: Group
  /** Where the entry goes; a command entry runs its command instead. */
  to?: string
  /** The command behind the entry: its keys show in place of the meta hint. */
  command?: CommandId
  /** Runs the command, after the palette has closed. */
  run?: boolean
  keywords: string
  /** The part of the app a navigation entry belongs to: in that part, its entries lead the empty palette. */
  area?: PaletteArea
  /** A task hit: status, ID and project. */
  task?: TaskReference
  /** A page's emoji, in place of the page icon. */
  emoji?: string | null
  /** Matched words in the title (the server's for pages, the query's for tasks), and body text around the match. */
  titleHighlights?: TextRange[]
  snippet?: { text: string; highlights: TextRange[] }
}

/** Text with the highlight ranges in bold (plain React text nodes, no HTML). */
function Highlighted({ text, ranges }: { text: string; ranges: TextRange[] | undefined }) {
  return (
    <>
      {highlightSegments(text, ranges).map((segment, index) =>
        segment.match ? (
          <strong key={index} className="font-semibold text-foreground" data-highlight>
            {segment.text}
          </strong>
        ) : (
          segment.text
        ),
      )}
    </>
  )
}

/** Where `query` first occurs in `text`, any case: the bold part of a task's title or ID. */
function queryRanges(text: string, query: string): TextRange[] {
  const needle = query.trim().toLowerCase().replace(/^#/, '')
  const start = needle ? text.toLowerCase().indexOf(needle) : -1
  return start === -1 ? [] : [{ start, end: start + needle.length }]
}

/** The leading glyph: a task's status, a page's emoji, a channel's #, or the entry's icon. */
function EntryGlyph({ entry }: { entry: CommandEntry }) {
  if (entry.task) return <span className="grid size-4 shrink-0 place-items-center"><TaskStatusIcon status={entry.task.status} size={14} /></span>
  if (entry.emoji) return <Emoji value={entry.emoji} className="grid size-4 shrink-0 place-items-center text-[0.875rem] leading-none" />
  return <entry.icon className="size-4 shrink-0 text-muted-foreground/70" />
}

/**
 * One result row. Each kind reads differently at a glance: a task shows its status, ID and project; a page its emoji,
 * matched words, body snippet and space; a conversation # or a person; navigation and commands their keys.
 */
function PaletteItem({ entry, query, onSelect }: { entry: CommandEntry; query: string; onSelect: () => void }) {
  const bindings = useBindings()
  const keys = entry.command ? bindings[entry.command] : null
  return (
    <CommandItem value={entry.id} data-kind={entry.kind} className={cn('gap-2.5 px-2.5 text-[0.8125rem]', entry.snippet ? 'min-h-10 py-1.5' : 'h-10')} onSelect={onSelect}>
      <EntryGlyph entry={entry} />
      {entry.task ? (
        <span className="min-w-[4.5rem] shrink-0 text-xs text-muted-foreground tabular-nums" data-task-id>
          <Highlighted text={entry.task.identifier} ranges={queryRanges(entry.task.identifier, query)} />
        </span>
      ) : null}
      {entry.snippet ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">
            <Highlighted text={entry.title} ranges={entry.titleHighlights} />
          </span>
          <span className="truncate text-xs text-muted-foreground" data-snippet>
            <Highlighted text={entry.snippet.text} ranges={entry.snippet.highlights} />
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate">
          {entry.titleHighlights ? <Highlighted text={entry.title} ranges={entry.titleHighlights} /> : entry.title}
        </span>
      )}
      <CommandShortcut className="max-w-[35%] truncate text-[0.6875rem] tracking-normal whitespace-nowrap text-muted-foreground/70">
        {entry.command && keys ? <ShortcutKeys keys={keys} /> : entry.meta}
      </CommandShortcut>
    </CommandItem>
  )
}

/** Hits shown per section, so one kind never crowds out the others. */
const SECTION_LIMIT: Record<PaletteSection, number> = { tasks: 8, docs: 6, chat: 5, navigation: 6 }
// each section's heading, a key of the `shell` catalog translated at render
const SECTION_HEADING = { tasks: 'nav.tasks', docs: 'nav.docs', chat: 'nav.chat', navigation: 'commandPalette.navigation' } as const satisfies Record<PaletteSection, string>

/**
 * The navigation entries. The destination's name and the search words come from `key` (`shell:commandPalette.destinations`
 * and `.keywords`), translated when the palette opens.
 */
const NAV_ENTRIES = [
  { key: 'home', icon: Home, to: '/' },
  { key: 'tasks', icon: SquareCheck, to: '/tasks', command: 'nav.tasks', area: 'tasks' },
  { key: 'docs', icon: FileText, to: '/docs', command: 'nav.docs', area: 'docs' },
  { key: 'mail', icon: Mail, to: '/mail', command: 'nav.mail' },
  { key: 'chat', icon: MessageSquare, to: '/chat', command: 'nav.chat', area: 'chat' },
  { key: 'inbox', icon: Bell, to: '/activity', command: 'nav.inbox' },
  { key: 'profile', icon: Users, to: '/profile', command: 'nav.profile' },
  { key: 'settings', icon: Settings, to: '/settings', command: 'nav.settings' },
  { key: 'members', icon: Users, to: '/settings/members' },
  { key: 'sessions', icon: ShieldCheck, to: '/profile/sessions' },
  { key: 'agentic', icon: RobotIcon, to: '/profile/agentic' },
  { key: 'notifications', icon: Settings, to: '/profile/notifications' },
  { key: 'trash', icon: Trash2, to: '/tasks-trash', command: 'nav.trash', area: 'tasks' },
  { key: 'pageTrash', icon: Trash2, to: '/docs/trash', area: 'docs' },
  { key: 'mine', icon: SquareCheck, to: '/tasks?view=mine', command: 'nav.mine', area: 'tasks' },
  { key: 'week', icon: SquareCheck, to: '/tasks?view=current_week', command: 'nav.week', area: 'tasks' },
  { key: 'overdue', icon: SquareCheck, to: '/tasks?view=overdue', command: 'nav.overdue', area: 'tasks' },
  { key: 'views', icon: SquareCheck, to: '/views', command: 'nav.views', area: 'tasks' },
  { key: 'appearance', icon: Settings, to: '/profile/appearance' },
  { key: 'shortcuts', icon: Settings, to: '/profile/shortcuts' },
] as const satisfies readonly { key: string; icon: LucideIcon; to: string; command?: CommandId; area?: PaletteArea }[]

/**
 * The conversations in the user's chat sidebar, read once from the chat cache when the palette opens (the shell keeps
 * that cache current for the Chat badge). Empty when chat is off.
 */
function useConversationEntries(workspaceId: string): CommandEntry[] {
  const queryClient = useQueryClient()
  const { t } = useTranslation('shell')
  const [entries] = useState<CommandEntry[]>(() => {
    if (!chatEnabled) return []
    const conversations = queryClient.getQueryData<Conversation[]>(chatKeys.conversations(workspaceId)) ?? []
    const people = queryClient.getQueryData<User[]>(queryKeys.members(workspaceId)) ?? []
    const currentUserId = queryClient.getQueryData<{ id: string } | null>(queryKeys.currentUser)?.id ?? ''
    return conversations
      .filter((conversation) => conversation.isMember && !conversation.archived)
      .map((conversation) => {
        const dm = conversation.kind === 'dm'
        return {
          id: `chat_${conversation.id}`,
          kind: 'chat' as const,
          icon: dm ? Person : Hashtag,
          title: dm ? conversationTitle(conversation, people, currentUserId) : conversation.name,
          meta: dm ? t('commandPalette.directMessage') : t('commandPalette.channel'),
          to: conversationPath(conversation.id),
          // "#general" finds the channel, as it is written in messages
          keywords: dm ? 'dm' : `#${conversation.name} ${conversation.topic}`,
        }
      })
  })
  return entries
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('shell')
  const theme = useAppSidebarTheme()
  const { workspace } = useWorkspace()
  const conversations = useConversationEntries(workspace.id)
  const navigate = useNavigate()
  // the part of the app in view: its results lead
  const here = paletteArea(useLocation().pathname)
  const [query, setQuery] = useState('')
  // Both searches wait for typing to pause and keep their last hits until the new ones arrive, so the list changes
  // once per search instead of flickering on each key.
  const debouncedQuery = useDebouncedValue(query, 250)
  const search = debouncedQuery.trim()
  const taskQuery = useTaskReferences(workspace.id, search, search.length > 0)
  const pageQuery = usePageSearch(workspace.id, debouncedQuery)
  const recentQuery = useRecentPages(workspace.id, !docsHidden)
  const recentCount = recentQuery.data?.length ?? 0
  const teamspaces = useTeamspaces(workspace.id, search.length > 0 || recentCount > 0)
  const searching = query.trim().length > 0

  const mailEnabled = useMailEnabled()
  const navigation = useMemo<CommandEntry[]>(() => {
    const entries = NAV_ENTRIES.filter(({ key }) => (key !== 'mail' || mailEnabled) && (key !== 'chat' || chatEnabled)).map(({ key, ...entry }) => {
      const name = t(`commandPalette.destinations.${key}`)
      return {
        ...entry,
        id: `nav_${key}`,
        kind: 'navigation' as const,
        name,
        title: t('commandPalette.goToDestination', { name }),
        meta: t('commandPalette.navigation'),
        keywords: t(`commandPalette.keywords.${key}`),
      }
    })
    return docsHidden ? entries.filter((entry) => !entry.to.startsWith('/docs')) : entries
  }, [mailEnabled, t])

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (entry: CommandEntry) => `${entry.title} ${entry.keywords}`.toLowerCase().includes(q)
    // Server hits: the server matched them (tasks also on their description and ID), so no local filter.
    const tasks: CommandEntry[] = searching
      ? (taskQuery.data ?? []).map((task) => ({
          id: `task_${task.id}`,
          kind: 'task',
          icon: SquareCheck,
          title: task.title,
          meta: task.projectName,
          to: task.path,
          keywords: task.identifier,
          task,
          // the hits are for the debounced query: so are their highlights
          titleHighlights: queryRanges(task.title, search),
        }))
      : []
    const pages: CommandEntry[] = searching && !docsHidden
      ? (pageQuery.data ?? []).map((page) => ({
          id: `page_${page.id}`,
          kind: 'page',
          icon: FileText,
          emoji: page.icon,
          title: pageTitle(page),
          // the Docs heading says it is a page: the hint says where it is (a row: its database)
          meta: page.database_title !== null ? t('commandPalette.rowMeta', { database: page.database_title || t('commandPalette.untitled') }) : spaceLabel(spaceKey(page), teamspaces.data),
          to: `/docs/${page.id}`,
          keywords: page.snippet,
          // Ranges index the page's own title; the "Untitled" fallback has none.
          titleHighlights: page.title ? page.title_highlights : [],
          snippet: page.snippet ? { text: page.snippet, highlights: page.snippet_highlights } : undefined,
        }))
      : []
    const byKind: Record<PaletteSection, CommandEntry[]> = {
      tasks,
      docs: pages,
      chat: searching ? conversations.filter(matches) : [],
      // While searching, the destinations of the part in view come first (a stable sort keeps the rest in place). The
      // empty list keeps one fixed order, so each entry is always in the same place.
      navigation: searching
        ? navigation.filter(matches).sort((a, b) => Number(b.area === here) - Number(a.area === here))
        : navigation.slice(0, recentCount > 0 ? 5 : 9),
    }
    const navigationNamed = byKind.navigation.some((entry) => namesDestination(entry.name ?? entry.title, q))
    return sectionOrder(here, query, navigationNamed)
      .map((id) => ({ id, heading: t(SECTION_HEADING[id]), entries: byKind[id].slice(0, searching ? SECTION_LIMIT[id] : undefined) }))
      .filter((section) => section.entries.length > 0)
  }, [query, search, searching, taskQuery.data, pageQuery.data, teamspaces.data, conversations, navigation, recentCount, here, t])

  /** Recently opened pages, shown while the query is empty. */
  const recent = useMemo<CommandEntry[]>(
    () =>
      searching || docsHidden
        ? []
        : (recentQuery.data ?? []).map((page) => ({
            id: `recent_${page.id}`,
            kind: 'page',
            icon: FileText,
            emoji: page.icon,
            title: pageTitle(page),
            // the Docs heading says it is a page: the hint says where it is (a row: its database)
            meta: page.database_title !== null ? t('commandPalette.rowMeta', { database: page.database_title || t('commandPalette.untitled') }) : spaceLabel(spaceKey(page), teamspaces.data),
            to: `/docs/${page.id}`,
            keywords: '',
          })),
    [searching, recentQuery.data, teamspaces.data, t],
  )

  // what can act now, read once when the palette opens: a task command needs the task the pointer was on
  const available = useAvailableCommands()
  const [commands] = useState<CommandEntry[]>(() => available()
    // not the keys that only move the focus or the selection: they mean nothing as a menu entry
    .filter((command) => !command.fixed && !command.repeat && command.group !== 'Navigation' && !command.id.startsWith('list.') && command.id !== 'palette.open' && command.id !== 'search.open')
    // the commands for the task come before those of the page
    .sort((a, b) => Number(b.group === 'Task') - Number(a.group === 'Task'))
    // the English title and group stay searchable in every language
    .map((command) => ({ id: `command_${command.id}`, kind: 'command', icon: COMMAND_ICON[command.group], title: commandTitle(command), meta: commandGroupLabel(command.group), group: command.group, command: command.id as CommandId, run: true, keywords: `${commandGroupLabel(command.group)} ${command.group} ${command.title}` })))
  const runCommand = useRunCommand()
  const matches = (entry: CommandEntry) => `${entry.title} ${entry.keywords}`.toLowerCase().includes(query.trim().toLowerCase())
  /** Commands for the task or the page in view come before everything; the general ones go last. */
  const contextual = commands.filter((entry) => entry.group !== 'General' && matches(entry))
  const general = commands.filter((entry) => entry.group === 'General' && matches(entry))

  const open = (entry: CommandEntry | undefined) => {
    if (!entry) return
    onClose()
    if (entry.run && entry.command) runCommand(entry.command)
    else if (entry.to) navigate(entry.to)
  }

  const group = (heading: string, entries: CommandEntry[], props: Record<string, string> = {}) =>
    entries.length > 0 ? (
      <CommandGroup key={heading} heading={heading} className="p-0" {...props}>
        {entries.map((entry) => (
          <PaletteItem key={entry.id} entry={entry} query={search} onSelect={() => open(entry)} />
        ))}
      </CommandGroup>
    ) : null
  const recentGroup = group(t('commandPalette.recent'), recent, { 'data-recent-pages': '' })

  return (
    <CommandDialog
      open
      onOpenChange={(next) => { if (!next) onClose() }}
      title={t('commandPalette.title')}
      description={chatEnabled ? t('commandPalette.descriptionWithChat') : t('commandPalette.description')}
      // the pink tint of the dark shell, like the sidebar menus, with the custom theme (`theme` is empty without one)
      className="top-[12vh] max-h-[min(60vh,28rem)] sm:max-w-[576px] bg-sidebar-popover dark:ring-sidebar-tint/22"
      style={theme.style}
    >
      {/* `shouldFilter={false}`: the entry list is already filtered here (tasks and pages are
          filtered server-side), so cmdk only owns highlighting and keyboard navigation. */}
      {/* the scheme class sets the default tokens again, so the theme's go on the same element */}
      <Command shouldFilter={false} className={cn('min-h-0 bg-transparent p-0', theme.scheme)} style={theme.style}>
        <div className="relative shrink-0">
          <CommandInput
            autoFocus
            className="pr-9"
            placeholder={chatEnabled ? t('commandPalette.placeholderWithChat') : t('commandPalette.placeholder')}
            value={query}
            onValueChange={setQuery}
          />
          <Kbd className="absolute top-1/2 right-3 -translate-y-1/2 px-1.5 text-[0.6875rem] text-muted-foreground/70">esc</Kbd>
        </div>
        <CommandList className="mx-1.5 mt-1 mb-1.5 max-h-none min-h-0 flex-1 rounded-lg bg-background p-1 ring-1 ring-border dark:bg-[color-mix(in_oklab,var(--sidebar-popover),white_3%)] dark:ring-sidebar-tint/12 dark:**:data-[slot=command-item]:data-selected:bg-sidebar-tint/10">
          <CommandEmpty className="p-6 text-[0.8125rem] text-muted-foreground">{t('commandPalette.noResults', { query })}</CommandEmpty>
          {group(t('commandPalette.commands'), contextual)}
          {/* in Docs, the pages opened last come before navigation */}
          {here === 'docs' ? recentGroup : null}
          {sections.map((section) => group(section.heading, section.entries, { 'data-section': section.id }))}
          {here === 'docs' ? null : recentGroup}
          {group(t('commandPalette.general'), general)}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
