import { useTranslation } from 'react-i18next'
import { Archive, Edit, Link2, Logout, Notification, Star, TickCircle } from 'reicon-react'
import {
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import type { NotifyLevel } from '@/features/chat/api/types'
import type { ConversationActions } from './useConversationActions'

/**
 * The items of a conversation's `…` menu, inside a `DropdownMenuContent`. The sidebar row (`placement="row"`) also has
 * "Mark as read"; the header does not.
 */
export function ConversationMenuItems({ actions, placement, onEdit }: { actions: ConversationActions; placement: 'row' | 'header'; onEdit: () => void }) {
  const { t } = useTranslation('chat')
  const { state } = actions
  const row = placement === 'row'
  return (
    <>
      {state ? (
        <>
          {row ? (
            <DropdownMenuItem disabled={state.unreadCount === 0 && state.mentionCount === 0} onClick={actions.markRead}>
              <TickCircle />
              {t('sidebar.menu.markAsRead')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={actions.toggleFavorite}>
            <Star weight={state.favorite ? 'Filled' : 'Outline'} />
            {state.favorite ? t('sidebar.menu.removeStar') : t('sidebar.menu.star')}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Notification />
              {t('sidebar.menu.notifications')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-auto min-w-40">
              <DropdownMenuRadioGroup value={state.notify} onValueChange={(value) => actions.setNotify(value as NotifyLevel)}>
                <DropdownMenuRadioItem value="all">{t('sidebar.menu.notifyAll')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mentions">{t('sidebar.menu.notifyMentions')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="muted">{t('sidebar.menu.notifyMuted')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </>
      ) : null}
      <DropdownMenuItem onClick={actions.copyLink}>
        <Link2 />
        {t('sidebar.menu.copyLink')}
      </DropdownMenuItem>
      {actions.canManage ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEdit}>
            <Edit />
            {t('sidebar.menu.editChannel')}
          </DropdownMenuItem>
        </>
      ) : null}
      {actions.canLeave || actions.canArchive ? <DropdownMenuSeparator /> : null}
      {actions.canLeave ? (
        <DropdownMenuItem onClick={() => void actions.leave()}>
          <Logout />
          {t('sidebar.menu.leaveChannel')}
        </DropdownMenuItem>
      ) : null}
      {actions.canArchive ? (
        <DropdownMenuItem variant="destructive" onClick={() => void actions.archive()}>
          <Archive />
          {t('sidebar.menu.archiveChannel')}
        </DropdownMenuItem>
      ) : null}
    </>
  )
}
