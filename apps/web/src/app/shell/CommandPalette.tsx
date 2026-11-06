import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { cn } from 'cn'
import { useAppSidebarTheme } from '@/lib/customTheme'
import { DocumentText as FileText, Home2 as Home, Message as MessageSquare, Notification as Bell, People as Users, Setting2 as Settings, ShieldTick as ShieldCheck, TaskSquare as SquareCheck, Trash as Trash2 } from 'reicon-react'
import type { IconComponent as LucideIcon } from 'reicon-react'
import { RobotIcon } from '@/components/common/icons/RobotIcon'
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
import { useProjects } from '@/features/tasks/api/projects'
import { taskFromRecord } from '@/features/tasks/api/models'
import { useTasks } from '@/features/tasks/api/tasks'
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
import { chatEnabled, docsHidden } from './productNavigation'
import { taskPath } from '@/lib/taskLinks'

const COMMAND_ICON: Record<Group, LucideIcon> = { General: Settings, Navigation: Home, List: SquareCheck, Task: SquareCheck, Docs: FileText, Chat: MessageSquare }

interface CommandEntry {
  id: string
  icon: LucideIcon
  title: string
  meta: string
  /** A navigation entry: these come first in the results. */
  navigation?: boolean
  /** The group of a command entry. */
  group?: Group
  /** Where the entry goes; a command entry runs its command instead. */
  to?: string
  /** The command behind the entry: its keys show in place of the meta hint. */
  command?: CommandId
  /** Runs the command, after the palette has closed. */
  run?: boolean
  keywords: string
  /** Already matched by the server (task and page search): skip the local title/keyword filter. */
  serverMatch?: boolean
  /** Page hits: matched words in the title, and body text around the match. */
  titleHighlights?: TextRange[]
  snippet?: { text: string; highlights: TextRange[] }
}

/** Text with the server's highlight ranges in bold (plain React text nodes, no HTML). */
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

/** One result row: icon, title (page hits add their highlights and a body snippet), and a meta hint. */
function PaletteItem({ entry, onSelect }: { entry: CommandEntry; onSelect: () => void }) {
  const bindings = useBindings()
  const keys = entry.command ? bindings[entry.command] : null
  return (
    <CommandItem value={entry.id} className={cn('gap-2.5 px-2.5 text-[13px]', entry.snippet ? 'min-h-10 py-1.5' : 'h-10')} onSelect={onSelect}>
      <entry.icon className="size-4 shrink-0 text-muted-foreground/70" />
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
        <span className="truncate">
          {entry.titleHighlights ? <Highlighted text={entry.title} ranges={entry.titleHighlights} /> : entry.title}
        </span>
      )}
      <CommandShortcut className="text-[11px] tracking-normal whitespace-nowrap text-muted-foreground/70">
        {entry.command && keys ? <ShortcutKeys keys={keys} /> : entry.meta}
      </CommandShortcut>
    </CommandItem>
  )
}

/**
 * The navigation entries. The id, title and search words come from `key` (`shell:commandPalette.entries` and
 * `.keywords`), translated when the palette opens.
 */
const NAV_ENTRIES = [
  { key: 'home', icon: Home, to: '/' },
  { key: 'tasks', icon: SquareCheck, to: '/tasks', command: 'nav.tasks' },
  { key: 'docs', icon: FileText, to: '/docs', command: 'nav.docs' },
  ...(chatEnabled ? [{ key: 'chat', icon: MessageSquare, to: '/chat', command: 'nav.chat' } as const] : []),
  { key: 'inbox', icon: Bell, to: '/activity', command: 'nav.inbox' },
  { key: 'profile', icon: Users, to: '/profile', command: 'nav.profile' },
  { key: 'settings', icon: Settings, to: '/settings', command: 'nav.settings' },
  { key: 'members', icon: Users, to: '/settings/members' },
  { key: 'sessions', icon: ShieldCheck, to: '/profile/sessions' },
  { key: 'agentic', icon: RobotIcon, to: '/profile/agentic' },
  { key: 'notifications', icon: Settings, to: '/profile/notifications' },
  { key: 'trash', icon: Trash2, to: '/tasks-trash', command: 'nav.trash' },
  { key: 'pageTrash', icon: Trash2, to: '/docs/trash' },
  { key: 'mine', icon: SquareCheck, to: '/tasks?view=mine', command: 'nav.mine' },
  { key: 'week', icon: SquareCheck, to: '/tasks?view=current_week', command: 'nav.week' },
  { key: 'overdue', icon: SquareCheck, to: '/tasks?view=overdue', command: 'nav.overdue' },
  { key: 'views', icon: SquareCheck, to: '/views', command: 'nav.views' },
  { key: 'appearance', icon: Settings, to: '/profile/appearance' },
  { key: 'shortcuts', icon: Settings, to: '/profile/shortcuts' },
] as const satisfies readonly { key: string; icon: LucideIcon; to: string; command?: CommandId }[]

/** Conversations shown for one search, so they never crowd out tasks and pages. */
const CONVERSATION_RESULT_LIMIT = 5

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
          icon: MessageSquare,
          title: dm ? conversationTitle(conversation, people, currentUserId) : `#${conversation.name}`,
          meta: dm ? t('commandPalette.directMessage') : t('commandPalette.channel'),
          to: conversationPath(conversation.id),
          keywords: dm ? 'dm' : conversation.topic,
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
  const projects = useProjects(workspace.id)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  // Both searches wait for typing to pause and keep their last hits until the new ones arrive, so the list changes
  // once per search instead of flickering on each key.
  const debouncedQuery = useDebouncedValue(query, 250)
  const search = debouncedQuery.trim()
  const taskQuery = useTasks(workspace.id, { search, limit: 25 }, { enabled: search.length > 0 })
  const pageQuery = usePageSearch(workspace.id, debouncedQuery)
  const recentQuery = useRecentPages(workspace.id, !docsHidden)
  const recentCount = recentQuery.data?.length ?? 0
  const teamspaces = useTeamspaces(workspace.id, search.length > 0 || recentCount > 0)

  const entries = useMemo<CommandEntry[]>(() => {
    const nav: CommandEntry[] = NAV_ENTRIES.map(({ key, ...entry }) => ({
      ...entry,
      id: `nav_${key}`,
      title: t(`commandPalette.entries.${key}`),
      meta: t('commandPalette.navigation'),
      navigation: true,
      keywords: t(`commandPalette.keywords.${key}`),
    }))
    // Server hits: the server matched them (tasks also on their description), so no local filter.
    const searching = query.trim().length > 0
    const tasks: CommandEntry[] = searching
      ? (taskQuery.data?.pages.flatMap((page) => page.items) ?? []).map((record) => taskFromRecord(record, projects.data?.find((project) => project.id === record.project_id))).map((t) => ({
          id: t.id,
          icon: SquareCheck,
          title: t.title,
          meta: t.identifier,
          to: taskPath(t),
          keywords: `${t.identifier} ${t.labels.join(' ')}`,
          serverMatch: true,
        }))
      : []
    const pages: CommandEntry[] = searching
      ? (pageQuery.data ?? []).map((page) => ({
          id: `page_${page.id}`,
          icon: FileText,
          title: pageTitle(page),
          meta: t('commandPalette.pageMeta', { space: spaceLabel(spaceKey(page), teamspaces.data) }),
          to: `/docs/${page.id}`,
          keywords: page.snippet,
          serverMatch: true,
          // Ranges index the page's own title; the "Untitled" fallback has none.
          titleHighlights: page.title ? page.title_highlights : [],
          snippet: page.snippet ? { text: page.snippet, highlights: page.snippet_highlights } : undefined,
        }))
      : []
    if (docsHidden) return [...nav.filter((entry) => !entry.to?.startsWith('/docs')), ...tasks]
    return [...nav, ...pages, ...tasks]
  }, [projects.data, taskQuery.data, pageQuery.data, teamspaces.data, query, t])

  /** Recently opened pages, shown while the query is empty. */
  const recent = useMemo<CommandEntry[]>(
    () =>
      query.trim() || docsHidden
        ? []
        : (recentQuery.data ?? []).map((page) => ({
            id: `recent_${page.id}`,
            icon: FileText,
            title: pageTitle(page),
            meta: t('commandPalette.pageMeta', { space: spaceLabel(spaceKey(page), teamspaces.data) }),
            to: `/docs/${page.id}`,
            keywords: '',
          })),
    [query, recentQuery.data, teamspaces.data, t],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries.slice(0, recentCount > 0 ? 5 : 9)
    const matches = (e: CommandEntry) => e.serverMatch || `${e.title} ${e.meta} ${e.keywords}`.toLowerCase().includes(q)
    const hits = entries.filter(matches)
    // navigation first, then a few conversations, then pages and tasks: all inside the one cap
    const navigation = hits.filter((e) => e.navigation)
    const chat = conversations.filter(matches).slice(0, CONVERSATION_RESULT_LIMIT)
    return [...navigation, ...chat, ...hits.filter((e) => !e.navigation)].slice(0, 12)
  }, [entries, conversations, query, recentCount])

  // what can act now, read once when the palette opens: a task command needs the task the pointer was on
  const available = useAvailableCommands()
  const [commands] = useState<CommandEntry[]>(() => available()
    // not the keys that only move the focus or the selection: they mean nothing as a menu entry
    .filter((command) => !command.fixed && !command.repeat && command.group !== 'Navigation' && !command.id.startsWith('list.') && command.id !== 'palette.open' && command.id !== 'search.open')
    // the commands for the task come before those of the page
    .sort((a, b) => Number(b.group === 'Task') - Number(a.group === 'Task'))
    // the English title and group stay searchable in every language
    .map((command) => ({ id: `command_${command.id}`, icon: COMMAND_ICON[command.group], title: commandTitle(command), meta: commandGroupLabel(command.group), group: command.group, command: command.id as CommandId, run: true, keywords: `${commandGroupLabel(command.group)} ${command.group} ${command.title}` })))
  const runCommand = useRunCommand()
  const matches = (entry: CommandEntry) => `${entry.title} ${entry.keywords}`.toLowerCase().includes(query.trim().toLowerCase())
  /** Commands for the task or the page in view come before everything; the general ones go last. */
  const here = commands.filter((entry) => entry.group !== 'General' && matches(entry))
  const general = commands.filter((entry) => entry.group === 'General' && matches(entry))

  const open = (entry: CommandEntry | undefined) => {
    if (!entry) return
    onClose()
    if (entry.run && entry.command) runCommand(entry.command)
    else if (entry.to) navigate(entry.to)
  }

  return (
    <CommandDialog
      open
      onOpenChange={(next) => { if (!next) onClose() }}
      title={t('commandPalette.title')}
      description={chatEnabled ? t('commandPalette.descriptionWithChat') : t('commandPalette.description')}
      // the pink tint of the dark shell, like the sidebar menus; the new UI adds the custom theme (`theme` is empty otherwise)
      className="top-[12vh] max-h-[min(60vh,28rem)] sm:max-w-[576px] dark:bg-sidebar-popover dark:ring-sidebar-tint/22 new-ui:bg-sidebar-popover"
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
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onValueChange={setQuery}
          />
          <Kbd className="absolute top-1/2 right-3 -translate-y-1/2 px-1.5 text-[11px] text-muted-foreground/70">esc</Kbd>
        </div>
        <CommandList className="mx-1.5 mt-1 mb-1.5 max-h-none min-h-0 flex-1 rounded-lg bg-background p-1 ring-1 ring-border dark:bg-[color-mix(in_oklab,var(--primary)_6%,oklch(0.2264_0_0))] new-ui:dark:bg-[color-mix(in_oklab,var(--sidebar-popover),white_3%)] dark:ring-sidebar-tint/12 dark:**:data-[slot=command-item]:data-selected:bg-sidebar-tint/10">
          <CommandEmpty className="p-6 text-[13px] text-muted-foreground">{t('commandPalette.noResults', { query })}</CommandEmpty>
          {here.length > 0 ? (
            <CommandGroup heading={t('commandPalette.commands')} className="p-0">
              {here.map((entry) => (
                <PaletteItem key={entry.id} entry={entry} onSelect={() => open(entry)} />
              ))}
            </CommandGroup>
          ) : null}
          {recent.length > 0 ? (
            <CommandGroup heading={t('commandPalette.recent')} className="p-0" data-recent-pages="">
              {recent.map((entry) => (
                <PaletteItem key={entry.id} entry={entry} onSelect={() => open(entry)} />
              ))}
            </CommandGroup>
          ) : null}
          <CommandGroup heading={recent.length > 0 || here.length > 0 ? t('commandPalette.goTo') : undefined} className="p-0">
            {results.map((entry) => (
              <PaletteItem key={entry.id} entry={entry} onSelect={() => open(entry)} />
            ))}
          </CommandGroup>
          {general.length > 0 ? (
            <CommandGroup heading={t('commandPalette.general')} className="p-0">
              {general.map((entry) => (
                <PaletteItem key={entry.id} entry={entry} onSelect={() => open(entry)} />
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
