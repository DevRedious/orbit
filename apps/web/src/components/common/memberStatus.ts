import { i18n } from '@/i18n'

/** What a member shows as; `invisible` is only ever the signed-in user's own choice. */
export type MemberStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'

/** The status as words, in the UI language. */
export function statusLabel(status: MemberStatus): string {
  return i18n.t(`shell:presence.${status}`)
}
