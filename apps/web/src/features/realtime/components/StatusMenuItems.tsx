import { useTranslation } from 'react-i18next'
import { Edit, SmileCircle, Xmark } from 'reicon-react'
import type { Presence } from '@orbit/api/generated/types.gen'
import { StatusMark } from '@/components/common/StatusMark'
import { DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useSetStatus } from '@/features/auth/api'
import { useOwnStatus } from '@/features/realtime/useOwnStatus'

/** The presences to pick; the ones with a hint show it under their name (`shell:status.presenceHint`). */
const PRESENCE_OPTIONS = ['online', 'idle', 'dnd', 'invisible'] as const satisfies readonly Presence[]
const PRESENCE_HINTS: Partial<Record<Presence, 'dnd' | 'invisible'>> = { dnd: 'dnd', invisible: 'invisible' }

/**
 * The signed-in user's status controls, as items of a `DropdownMenuContent`: the presence choice, then the custom
 * status. The dialog for the custom status belongs to the host (`onEditCustom`), because the menu closes on a click.
 */
export function StatusMenuItems({ onEditCustom }: { onEditCustom: () => void }) {
  const { t } = useTranslation('shell')
  const status = useOwnStatus()
  const setStatus = useSetStatus()
  const custom = { emoji: status.emoji, text: status.text, expires_at: status.expiresAt }
  const hasCustom = status.emoji !== null || status.text !== null

  return (
    <>
      <DropdownMenuRadioGroup aria-label={t('status.label')} value={status.presence} onValueChange={(value) => setStatus.mutate({ presence: value as Presence, ...custom })}>
        {PRESENCE_OPTIONS.map((presence) => {
          const hint = PRESENCE_HINTS[presence]
          return (
            <DropdownMenuRadioItem key={presence} value={presence} closeOnClick className="gap-2">
              <StatusMark status={presence} size={10} className="bg-popover *:bg-popover" />
              <span className="flex min-w-0 flex-col">
                <span>{t(`presence.${presence}`)}</span>
                {hint ? <span className="text-xs text-muted-foreground">{t(`status.presenceHint.${hint}`)}</span> : null}
              </span>
            </DropdownMenuRadioItem>
          )
        })}
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onEditCustom}>
        {hasCustom ? <Edit /> : <SmileCircle />}
        {hasCustom ? t('status.editCustom') : t('status.setCustom')}
      </DropdownMenuItem>
      {hasCustom ? (
        <DropdownMenuItem onClick={() => setStatus.mutate({ presence: status.presence, emoji: null, text: null, expires_at: null })}>
          <Xmark />
          {t('status.clearCustom')}
        </DropdownMenuItem>
      ) : null}
    </>
  )
}
