import type { Translation } from '../../../types'
import type source from '../../en/chat/thread'

export default {
  title: 'Thread',
  follow: 'Thread folgen',
  unfollow: 'Thread nicht mehr folgen',
  followingTip: 'Du folgst. Du wirst über neue Antworten benachrichtigt.',
  followTip: 'Folgen, um über neue Antworten benachrichtigt zu werden',
  followFailed: 'Dem Thread konnte nicht gefolgt werden. Versuch es noch einmal.',
  unfollowFailed: 'Das Folgen konnte nicht beendet werden. Versuch es noch einmal.',
  openFullTip: 'In Vollansicht öffnen',
  openFull: 'Thread in Vollansicht öffnen',
  close: 'Thread schließen',
  back: 'Zurück',
  rootLine: ' · „{{line}}“',
  sidePaneTip: 'Im Seitenbereich anzeigen',
  sidePane: 'Thread im Seitenbereich anzeigen',
  actions: 'Thread-Aktionen',
  copyLink: 'Link kopieren',
  linkCopied: 'Link kopiert',
  copyFailed: 'Kopieren fehlgeschlagen. Versuch es noch einmal.',
  showIn: 'In {{conversation}} anzeigen',
  archivedNotice: 'Dieser Kanal ist archiviert. Du kannst ihn lesen, aber keine Nachrichten senden.',
  joinToReply: 'Tritt dem Kanal bei, um zu antworten.',
  loadFailed: 'Dieser Thread konnte nicht geladen werden. Er wurde eventuell gelöscht.',
  tryAgain: 'Erneut versuchen',
} satisfies Translation<typeof source>
