import type { ComponentType } from 'react'
import { useRender } from '@base-ui/react/use-render'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { Home2 as Home, Message as MessageSquare, DocumentText as FileText, Setting2 as Settings, Sms as Mail, TaskSquare as SquareCheck } from 'reicon-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { chatEnabled, docsHidden, isChatConversationPath, mobileDockPathsFor } from './productNavigation'

// `area` names the label in `shell:nav`, translated at render
const DOCK_LINKS = [
  { to: '/', area: 'home', icon: Home },
  { to: '/tasks', area: 'tasks', icon: SquareCheck },
  { to: '/docs', area: 'docs', icon: FileText },
  { to: '/chat', area: 'chat', icon: MessageSquare },
  { to: '/mail', area: 'mail', icon: Mail },
  { to: '/settings', area: 'settings', icon: Settings },
] as const

const SHOWN_DOCK_LINKS = DOCK_LINKS.filter((link) => !(docsHidden && link.to === '/docs'))

/** A dock entry: a link for the sections that exist, a disabled button for the upcoming ones. */
function MobileDockItem({ to, label, icon: Icon, enabled, badge = 0, unread = false }: { to: string; label: string; icon: ComponentType<{ className?: string }>; enabled: boolean; badge?: number; /** A dot when there is no count. */ unread?: boolean }) {
  const { t } = useTranslation('shell')
  const count = enabled ? badge : 0
  const dot = enabled && count === 0 && unread
  return useRender({
    render: enabled ? <NavLink to={to} end={to === '/'} aria-label={count > 0 ? t('nav.unreadCount', { label, count }) : dot ? t('nav.unread', { label }) : undefined} /> : <Button variant="ghost" disabled aria-label={label} />,
    props: {
      'data-slot': 'mobile-dock-item',
      className: cn(
        'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground',
        enabled
          ? 'aria-[current=page]:text-primary'
          : 'h-auto rounded-none p-0 hover:bg-transparent dark:hover:bg-transparent disabled:pointer-events-auto disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:opacity-100',
      ),
      children: (
        <>
          <span className="relative">
            <Icon className="size-5" />
            {count > 0 ? (
              <span
                data-slot="mobile-dock-badge"
                aria-hidden="true"
                className="absolute -top-1 left-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums"
              >
                {count > 99 ? '99+' : count}
              </span>
            ) : dot ? (
              <span data-slot="mobile-dock-dot" aria-hidden="true" className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
            ) : null}
          </span>
          {label}
        </>
      ),
    },
  })
}

/**
 * The phone's bottom navigation. A chat conversation is a full screen, so the dock is not shown there.
 * It also hides while the keyboard is open, so the field being typed in keeps the space.
 */
export function MobileDock({ chatEnabled: chat = chatEnabled, chatBadge = 0, chatUnread = false }: { chatEnabled?: boolean; /** Unread count on the Chat item. */ chatBadge?: number; /** Chat has an unread message, with or without a count. */ chatUnread?: boolean }) {
  const { t } = useTranslation('shell')
  const { pathname } = useLocation()
  if (isChatConversationPath(pathname)) return null
  const paths = mobileDockPathsFor(chat)
  return (
    <nav
      className="hidden h-auto min-h-14 shrink-0 items-stretch bg-background pt-3 [@media(display-mode:standalone)]:pb-[env(safe-area-inset-bottom,0px)] max-[899px]:not-in-data-keyboard:flex"
      aria-label={t('nav.mobileNavigation')}
    >
      {SHOWN_DOCK_LINKS.map((link) => (
        <MobileDockItem key={link.to} to={link.to} label={t(`nav.${link.area}`)} icon={link.icon} enabled={paths.includes(link.to)} badge={link.to === '/chat' ? chatBadge : 0} unread={link.to === '/chat' && chatUnread} />
      ))}
    </nav>
  )
}
