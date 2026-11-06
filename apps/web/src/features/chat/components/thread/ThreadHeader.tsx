import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bell, BellOff, Maximize4, Minimize, MoreH, Xmark } from 'reicon-react'
import { toast } from 'sonner'
import { PaneHeader, PaneTitle } from '@/components/common/Pane'
import { Tip } from '@/components/common/Tip'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSetThreadFollow } from '../../api/mutations'
import { threadPath } from '../../chatRoutes'
import { useChatNavigation } from '../../useChatNavigation'

function FollowButton({ rootId, following }: { rootId: string; following: boolean }) {
  const { t } = useTranslation('chat')
  const { mutate: setFollow, isPending } = useSetThreadFollow()
  const label = following ? t('thread.unfollow') : t('thread.follow')
  return (
    <Tip label={following ? t('thread.followingTip') : t('thread.followTip')} side="bottom">
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={following}
        disabled={isPending}
        onClick={() =>
          setFollow(
            { rootId, following: !following },
            { onError: () => toast.error(following ? t('thread.unfollowFailed') : t('thread.followFailed')) },
          )
        }
      >
        {following ? <Bell className="size-5 text-primary" /> : <BellOff className="size-5" />}
      </Button>
    </Tip>
  )
}

interface ThreadHeaderProps {
  conversationId: string
  rootId: string
  variant: 'pane' | 'full'
  /** `#channel`, or the names of a DM. */
  conversationTitle: string
  /** The first line of the root message, already cut. */
  rootLine: string
  following: boolean
  /** Shows expand (pane) or collapse (full). */
  canResize: boolean
  /** Runs before expand or collapse navigates, to hand over the scroll position. */
  onResize: () => void
  onClose: () => void
}

/** The 48px header of a thread. Pane: "Thread", expand, follow, close. Full view: breadcrumb, collapse, follow, `…`. */
export function ThreadHeader({
  conversationId,
  rootId,
  variant,
  conversationTitle,
  rootLine,
  following,
  canResize,
  onResize,
  onClose,
}: ThreadHeaderProps) {
  const { t } = useTranslation('chat')
  const { expandThread, collapseThread, openConversation } = useChatNavigation()

  if (variant === 'pane') {
    return (
      <PaneHeader data-slot="thread-header" className="gap-1">
        <PaneTitle render={<h2 />} className="flex-1">
          {t('thread.title')}
        </PaneTitle>
        {canResize ? (
          <Tip label={t('thread.openFullTip')} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('thread.openFull')}
              onClick={() => {
                onResize()
                expandThread(rootId)
              }}
            >
              <Maximize4 className="size-5" />
            </Button>
          </Tip>
        ) : null}
        <FollowButton rootId={rootId} following={following} />
        <Tip label={t('thread.close')} side="bottom">
          <Button variant="ghost" size="icon" aria-label={t('thread.close')} onClick={onClose}>
            <Xmark className="size-5" />
          </Button>
        </Tip>
      </PaneHeader>
    )
  }

  return (
    <PaneHeader data-slot="thread-header" className="gap-1">
      <Button variant="ghost" size="icon" className="min-[900px]:hidden" aria-label={t('thread.back')} onClick={onClose}>
        <ArrowLeft className="size-5" />
      </Button>
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap text-[13px]">
          <BreadcrumbItem className="shrink-0">
            {/* The channel crumb opens the channel at the root message. */}
            <BreadcrumbLink
              render={<button type="button" onClick={() => openConversation(conversationId, rootId)} />}
              className="rounded-sm font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {conversationTitle}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="shrink-0" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">
              <span className="font-semibold">{t('thread.title')}</span>
              {rootLine ? <span className="text-muted-foreground">{t('thread.rootLine', { line: rootLine })}</span> : null}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {canResize ? (
        <Tip label={t('thread.sidePaneTip')} side="bottom">
          <Button
            variant="ghost"
            size="icon"
            className="max-[899px]:hidden"
            aria-label={t('thread.sidePane')}
            onClick={() => {
              onResize()
              collapseThread(rootId)
            }}
          >
            <Minimize className="size-5" />
          </Button>
        </Tip>
      ) : null}
      <FollowButton rootId={rootId} following={following} />
      <DropdownMenu>
        <Tip label={t('thread.actions')} side="bottom">
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t('thread.actions')} />}>
            <MoreH className="size-5" />
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}${threadPath(conversationId, rootId)}`).then(
                () => toast.success(t('thread.linkCopied')),
                () => toast.error(t('thread.copyFailed')),
              )
            }}
          >
            {t('thread.copyLink')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openConversation(conversationId, rootId)}>{t('thread.showIn', { conversation: conversationTitle })}</DropdownMenuItem>
          <DropdownMenuItem onClick={onClose}>{t('thread.close')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </PaneHeader>
  )
}
