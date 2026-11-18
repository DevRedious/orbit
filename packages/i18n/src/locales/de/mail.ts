import type { Translation } from '../../types'
import type source from '../en/mail'

export default {
  title: 'Mail',
  tryAgain: 'Erneut versuchen',
  saveFailed: 'Die Änderung konnte nicht gespeichert werden.',
  unknownSender: 'Unbekannter Absender',
  noSubject: '(kein Betreff)',
  // the file name of an attachment that has none
  attachmentName: 'anhang',
  folders: {
    inbox: 'Posteingang',
    archive: 'Archiv',
    spam: 'Spam',
    trash: 'Papierkorb',
  },
  views: {
    starred: 'Markiert',
    search: 'Suche',
    label: 'Label',
    mailbox: 'Postfach',
    mailboxFolder: '{{mailbox}} · {{folder}}',
  },
  rail: {
    label: 'Mail-Ordner',
    labels: 'Labels',
    unread_one: '{{label}}, {{count}} ungelesen',
    unread_other: '{{label}}, {{count}} ungelesen',
  },
  search: {
    label: 'Mails durchsuchen',
    placeholder: 'Mails durchsuchen',
    suggestions: 'Suchvorschläge',
  },
  list: {
    loading: 'Konversationen werden geladen',
    loadFailed: 'Mails konnten nicht geladen werden',
    loadFailedDescription: 'Prüfe deine Verbindung und versuch es noch einmal.',
  },
  row: {
    summary: '{{senders}}: {{subject}}',
    summaryUnread: 'Ungelesen, {{senders}}: {{subject}}',
    select: 'Konversation auswählen',
    hasAttachments: 'Mit Anhängen',
  },
  actions: {
    back: 'Zurück',
    star: 'Markieren',
    unstar: 'Markierung entfernen',
    markRead: 'Als gelesen markieren',
    markUnread: 'Als ungelesen markieren',
    archive: 'Archivieren',
    moveToInbox: 'In den Posteingang verschieben',
    reportSpam: 'Als Spam melden',
    notSpam: 'Kein Spam',
    restore: 'Wiederherstellen',
    moveToTrash: 'In den Papierkorb verschieben',
  },
  labelMenu: {
    title: 'Labels',
    create: 'Labels in den Einstellungen erstellen',
    none: 'Noch keine Labels',
  },
  bulk: {
    clear: 'Auswahl aufheben',
    selected_one: '{{count}} ausgewählt',
    selected_other: '{{count}} ausgewählt',
  },
  thread: {
    loadFailed: 'Diese Konversation konnte nicht geladen werden',
    loadFailedDescription: 'Sie wurde eventuell gelöscht, oder die Verbindung ist fehlgeschlagen.',
    inSpam: 'Im Spam',
    inSpamDescription:
      'Links und Bilder in Spam können schädlich sein. Verschieb sie nur in den Posteingang, wenn du dem Absender vertraust.',
    inTrash: 'Im Papierkorb',
    inTrashDescription: 'Konversationen im Papierkorb werden nach 30 Tagen endgültig gelöscht.',
  },
  message: {
    frameTitle: 'Nachricht',
    frameFailed: 'Die Nachricht konnte nicht angezeigt werden.',
    dmarcConfirmed: 'DMARC hat bestätigt, dass die Nachricht von dieser Domain stammt.',
    dateTime: '{{date}}, {{time}}',
    actions: 'Nachrichtenaktionen',
    showOriginal: 'Original anzeigen',
    downloadEml: '.eml herunterladen',
    print: 'Drucken',
    to: 'An: {{people}}',
    cc: 'Cc: {{people}}',
    sentBy: 'Gesendet von {{sender}}',
    imagesHidden: 'Externe Bilder sind ausgeblendet.',
    loadImages: 'Bilder laden',
    alwaysForSender: 'Immer für diesen Absender',
    imagesAlways: 'Bilder von {{address}} werden ab jetzt sofort geladen.',
    settingFailed: 'Die Einstellung konnte nicht gespeichert werden.',
    original: {
      title: 'Originalnachricht',
      description: 'Die Nachricht so, wie Orbit sie empfangen hat.',
      truncated: 'Nur der Anfang wird angezeigt. Lade die .eml-Datei herunter, um die ganze Nachricht zu sehen.',
      loadFailed: 'Die Originalnachricht konnte nicht geladen werden.',
    },
  },
  // the warnings over a message; each has a variant for when the sender's domain or address is unknown
  safety: {
    auth: {
      title: 'Authentifizierung fehlgeschlagen',
      body: 'Diese Nachricht gibt an, von {{domain}} zu stammen, aber diese Domain hat das nicht bestätigt (DMARC). Sie könnte gefälscht sein: Vertrau ihren Links und Aufforderungen nicht.',
      bodyNoDomain:
        'Diese Nachricht gibt an, von einer Domain zu stammen, aber diese Domain hat das nicht bestätigt (DMARC). Sie könnte gefälscht sein: Vertrau ihren Links und Aufforderungen nicht.',
    },
    lookalike: {
      title: 'Ähnlicher Name',
      body: 'Der Absender verwendet den Namen von {{member}}, aber {{address}} gehört nicht zu dieser Person.',
      bodyNoAddress: 'Der Absender verwendet den Namen von {{member}}, aber diese Adresse gehört nicht zu dieser Person.',
    },
    joined: {
      title: 'Antwort von außen',
      body: 'Diese Nachricht kam von außerhalb des Arbeitsbereichs in eine Konversation, die intern begonnen hat. Prüfe den Absender, bevor du darauf reagierst.',
    },
    external: {
      title: 'Externer Absender',
      body: '{{domain}} liegt außerhalb dieses Arbeitsbereichs. Sei vorsichtig mit Links und Anhängen.',
      bodyNoDomain: 'Der Absender liegt außerhalb dieses Arbeitsbereichs. Sei vorsichtig mit Links und Anhängen.',
    },
    warning: {
      title: 'Als reiner Text angezeigt',
      limit:
        'Diese Nachricht ist zu groß oder zu komplex, um sie vollständig anzuzeigen. Lade das Original herunter, um alles zu sehen.',
      unreadable:
        'Diese Nachricht konnte nicht vollständig gelesen werden. Lade das Original herunter, um alles zu sehen.',
    },
  },
  notice: {
    suspendedOne: '{{name}} ist gesperrt',
    suspendedSeveral_one: '{{count}} Postfach ist gesperrt',
    suspendedSeveral_other: '{{count}} Postfächer sind gesperrt',
    refusedTo: 'Neue Mails an {{address}} werden abgewiesen.',
    refusedThem: 'Neue Mails an sie werden abgewiesen.',
    readable: 'Die bereits vorhandenen Mails bleiben lesbar.',
    askAdmin: 'Bitte einen Admin, es wieder zu aktivieren.',
    resume: 'Wieder aktivieren',
  },
  empty: {
    inbox: { title: 'Dein Posteingang ist leer', description: 'Neue Mails erscheinen hier.' },
    archive: {
      title: 'Nichts archiviert',
      description: 'Archivierte Konversationen erscheinen hier. Drück E, um eine zu archivieren.',
    },
    spam: { title: 'Kein Spam', description: 'Mails, deren Authentifizierung fehlschlägt, landen hier.' },
    trash: {
      title: 'Der Papierkorb ist leer',
      description: 'Konversationen im Papierkorb werden nach 30 Tagen endgültig gelöscht.',
    },
    label: {
      title: 'Keine Konversationen mit diesem Label',
      description: 'Drück L in einer Konversation, um ein Label hinzuzufügen.',
    },
    starred: { title: 'Keine markierten Konversationen', description: 'Drück S, um eine Konversation zu markieren.' },
    noResults: { title: 'Keine Ergebnisse', description: 'Versuch andere Wörter oder weniger Operatoren.' },
    search: {
      title: 'Deine Mails durchsuchen',
      description: 'Verwende from:, to:, subject:, label:, in:, is:unread, has:attachment, before: und after:.',
    },
    noThread: {
      title: 'Konversation auswählen',
      description: 'Wähle eine Konversation aus der Liste, um sie hier zu lesen.',
    },
  },
  setup: {
    title: 'Mail einrichten',
    description: 'Füge eine Domain hinzu und erstelle Postfächer – dann kommen die Mails deines Teams hier an.',
    action: 'Mail einrichten',
    noMailbox: 'Noch kein Postfach',
    noMailboxDescription: 'Bitte einen Admin um ein Postfach.',
  },
} satisfies Translation<typeof source>
