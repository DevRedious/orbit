import type { Translation } from '../../../types'
import type source from '../../en/chat/messages'

export default {
  unknown: 'Unbekannt',
  someone: 'Jemand',
  list: {
    jumpToFirstUnread: 'Zur ersten ungelesenen Nachricht',
    jumpToLatest: 'Zur neuesten Nachricht',
    newCount_one: '{{count}} neue Nachricht',
    newCount_other: '{{count}} neue Nachrichten',
    /** Read out for a message that arrives: the author, then the start of the message. */
    announcement: '{{name}}: {{text}}',
    editFailed: 'Die Änderung konnte nicht gespeichert werden. Versuch es noch einmal.',
  },
  rows: {
    newMessages: 'Neue Nachrichten',
    blocked: 'Nachricht von einer Person, die du blockiert hast',
    showBlocked: 'Anzeigen',
    new: 'Neu',
    replyCount_one: '{{count}} Antwort',
    replyCount_other: '{{count}} Antworten',
    system: {
      pin: '<author>{{name}}</author> hat eine Nachricht angeheftet',
      join: '<author>{{name}}</author> ist beigetreten',
      leave: '<author>{{name}}</author> hat den Kanal verlassen',
    },
  },
  typing: {
    one: '{{name}} schreibt',
    two: '{{first}} und {{second}} schreiben',
    several: 'Mehrere Personen schreiben',
  },
  item: {
    sending: 'Wird gesendet',
    notSent: 'Nicht gesendet.',
    tryAgain: 'Erneut versuchen',
    delete: 'Löschen',
    repliedToThread: 'hat in einem Thread geantwortet',
    pinned: 'Angeheftet',
  },
  body: {
    deleted: 'Diese Nachricht wurde gelöscht',
    edited: '(bearbeitet)',
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',
    stickerDeleted: 'Sticker wurde gelöscht',
  },
  quote: {
    deleted: 'Die Originalnachricht wurde gelöscht',
  },
  forward: {
    forwarded: 'Weitergeleitet',
  },
  reactions: {
    /** The current user among other reactors: "Ada and you". */
    you: 'du',
    /** The current user alone. */
    youAlone: 'Du',
    names: '{{rest}} und {{last}}',
    label: '{{emoji}} {{count}}, Reaktion von {{names}}',
    tooltip: '{{names}} hat mit {{emoji}} reagiert',
  },
  toolbar: {
    label: 'Nachrichtenaktionen',
    reactWith: 'Mit {{emoji}} reagieren',
    addReaction: 'Reaktion hinzufügen',
    reply: 'Antworten',
    replyInThread: 'Im Thread antworten',
    forward: 'Weiterleiten',
    moreActions: 'Weitere Aktionen',
  },
  actions: {
    addReaction: 'Reaktion hinzufügen',
    reply: 'Antworten',
    replyInThread: 'Im Thread antworten',
    forward: 'Weiterleiten',
    copyLink: 'Link kopieren',
    copyText: 'Text kopieren',
    createTask: 'Aufgabe erstellen',
    pin: 'Anheften',
    unpin: 'Lösen',
    markUnread: 'Als ungelesen markieren',
    report: 'Melden',
    block: 'Blockieren',
    unblock: 'Blockierung aufheben',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    linkCopied: 'Link kopiert',
    textCopied: 'Text kopiert',
    copyFailed: 'Kopieren fehlgeschlagen. Versuch es noch einmal.',
    reactionFailed: 'Die Reaktion konnte nicht aktualisiert werden. Versuch es noch einmal.',
    pinFailed: 'Die Nachricht konnte nicht angeheftet werden. Versuch es noch einmal.',
    unpinFailed: 'Die Nachricht konnte nicht gelöst werden. Versuch es noch einmal.',
    markUnreadFailed: 'Konnte nicht als ungelesen markiert werden. Versuch es noch einmal.',
    deleteFailed: 'Die Nachricht konnte nicht gelöscht werden. Versuch es noch einmal.',
    deleteTitle: 'Nachricht löschen?',
    deleteWithReplies: 'Die Antworten bleiben im Thread. Das lässt sich nicht rückgängig machen.',
    deleteDescription: 'Das lässt sich nicht rückgängig machen.',
    deleteConfirm: 'Löschen',
  },
  block: {
    thisPerson: 'diese Person',
    title: '{{name}} blockieren?',
    description:
      'Chat blendet die Nachrichten dieser Person für dich aus. Sie kann dir keine Direktnachrichten senden. Du kannst die Blockierung in den Kontoeinstellungen aufheben.',
    confirm: 'Blockieren',
    blocked: 'Du hast {{name}} blockiert.',
    blockFailed: '{{name}} konnte nicht blockiert werden. Versuch es noch einmal.',
    unblocked: 'Du hast die Blockierung von {{name}} aufgehoben.',
    unblockFailed: 'Die Blockierung von {{name}} konnte nicht aufgehoben werden. Versuch es noch einmal.',
  },
  /** An integration's messages. */
  bot: {
    /** After its name; it shows in capitals. */
    badge: 'App',
  },
  ephemeral: {
    onlyYou: 'Nur für dich sichtbar',
    dismiss: 'Ausblenden',
  },
  blocks: {
    clickFailed: 'Die Integration hat den Klick nicht angenommen.',
  },
  editor: {
    label: 'Nachricht bearbeiten',
    save: 'Speichern',
    cancel: 'Abbrechen',
    overLimit_one: '{{count}} Zeichen über dem Limit',
    overLimit_other: '{{count}} Zeichen über dem Limit',
    /** `<enter/>` and `<esc/>` are the keys. */
    hint: '<enter/> zum Speichern, <esc/> zum Abbrechen',
  },
  replySummary: {
    unread_one: ', {{count}} ungelesen',
    unread_other: ', {{count}} ungelesen',
    lastReply: 'letzte Antwort {{time}}',
  },
  start: {
    selfTitle: 'Das ist dein Bereich',
    selfBody:
      'Entwirf Nachrichten, halte Links und Dateien griffbereit oder notier dir etwas. Nur du kannst ihn sehen.',
    dmTitle: 'Das ist der Anfang deiner Konversation mit {{title}}',
    channelTitle: 'Das ist der Anfang von {{title}}',
    createdBy: 'Erstellt von <creator>{{name}}</creator> am {{date}}',
    createdOn: 'Erstellt am {{date}}',
    addPeople: 'Personen hinzufügen',
  },
  embed: {
    videoBy: 'Video von {{name}}',
    playVideo: 'Video abspielen',
    play: '{{title}} abspielen',
    replies_one: '{{count}} Antwort',
    replies_other: '{{count}} Antworten',
    reposts_one: '{{count}} Repost',
    reposts_other: '{{count}} Reposts',
    likes_one: '{{count}} Like',
    likes_other: '{{count}} Likes',
  },
} satisfies Translation<typeof source>
