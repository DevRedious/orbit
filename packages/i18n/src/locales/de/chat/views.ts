import type { Translation } from '../../../types'
import type source from '../../en/chat/views'

export default {
  unknownAuthor: 'Unbekannt',
  deleted: 'Diese Nachricht wurde gelöscht',
  tryAgain: 'Erneut versuchen',
  threads: {
    title: 'Threads',
    unknownConversation: 'Unbekannte Konversation',
    replies_one: '{{count}} Antwort',
    replies_other: '{{count}} Antworten',
    rowLabel: 'Thread in {{title}}, {{replies}}',
    rowLabelUnread_one: 'Thread in {{title}}, {{replies}}, {{count}} ungelesen',
    rowLabelUnread_other: 'Thread in {{title}}, {{replies}}, {{count}} ungelesen',
    lastReply: 'letzte Antwort {{ago}}',
    loadFailed: 'Deine Threads konnten nicht geladen werden.',
    emptyTitle: 'Threads, denen du folgst, erscheinen hier',
    emptyDescription:
      'Antworte auf eine Nachricht oder folge ihrem Thread, dann erscheinen neue Antworten in dieser Liste.',
  },
  unreads: {
    title: 'Ungelesen',
    unreadCount_one: '{{count}} ungelesen',
    unreadCount_other: '{{count}} ungelesen',
    markAsRead: 'Als gelesen markieren',
    markReadFailed: 'Konnte nicht als gelesen markiert werden. Versuch es noch einmal.',
    messagesLoadFailed: 'Diese Nachrichten konnten nicht geladen werden.',
    messagesLabel: 'Ungelesene Nachrichten in {{title}}',
    moreUnread_one: '{{count}} weitere ungelesene Nachricht',
    moreUnread_other: '{{count}} weitere ungelesene Nachrichten',
    markAllAsRead: 'Alle als gelesen markieren',
    loadFailed: 'Deine ungelesenen Nachrichten konnten nicht geladen werden.',
    emptyTitle: 'Du bist auf dem neuesten Stand',
    emptyDescription:
      'Neue Nachrichten und Thread-Antworten in deinen Kanälen und Direktnachrichten erscheinen hier.',
    markedAllRead: 'Alle als gelesen markiert',
    undo: 'Rückgängig',
    undoFailed: 'Rückgängigmachen fehlgeschlagen. Versuch es noch einmal.',
    markAllReadFailed: 'Konnte nicht alle als gelesen markieren. Versuch es noch einmal.',
    thread: {
      label: 'Thread in {{title}}',
      unreadReplies_one: '{{count}} ungelesene Antwort',
      unreadReplies_other: '{{count}} ungelesene Antworten',
      repliesLoadFailed: 'Diese Antworten konnten nicht geladen werden.',
      repliesLabel: 'Ungelesene Antworten im Thread in {{title}}',
      moreReplies_one: '{{count}} weitere ungelesene Antwort',
      moreReplies_other: '{{count}} weitere ungelesene Antworten',
    },
  },
} satisfies Translation<typeof source>
