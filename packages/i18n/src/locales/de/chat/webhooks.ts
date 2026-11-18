import type { Translation } from '../../../types'
import type source from '../../en/chat/webhooks'

export default {
  intro:
    'Mit eingehenden Webhooks können Tools wie CI, Monitoring oder Ticketsysteme Nachrichten in #{{name}} posten. Jeder hat eine geheime URL, die eine JSON-Nachricht entgegennimmt.',
  copyFailed: 'Kopieren fehlgeschlagen. Markiere den Text und kopiere ihn.',
  loadFailed: 'Die Webhooks konnten nicht geladen werden. Versuch es noch einmal.',
  empty: 'Noch keine eingehenden Webhooks.',
  new: 'Neuer Webhook',
  save: 'Speichern',
  saving: 'Wird gespeichert …',
  rotate: {
    title: 'Neue URL für {{name}} erzeugen?',
    description: 'Die alte URL funktioniert ab sofort nicht mehr. Tools, die sie nutzen, brauchen die neue.',
    confirm: 'Neue URL erzeugen',
    failed: 'Es konnte keine neue URL erzeugt werden. Versuch es noch einmal.',
  },
  delete: {
    title: '{{name}} löschen?',
    description: 'Seine URL funktioniert dann nicht mehr. Die Nachrichten, die er gepostet hat, bleiben.',
    confirm: 'Löschen',
    failed: 'Der Webhook konnte nicht gelöscht werden. Versuch es noch einmal.',
  },
  row: {
    formerMember: 'ein ehemaliges Mitglied',
    neverUsed: 'nie verwendet',
    lastUsed: 'zuletzt verwendet {{time}}',
    madeBy: 'Erstellt von {{name}}',
    buttonsOn: 'Buttons aktiv',
    eventsOn: 'Events aktiv',
    options: 'Optionen für {{name}}',
    edit: 'Bearbeiten',
    interactivity: 'Interaktivität',
  },
  interactivity: {
    savedEvents: 'Klicks und Nachrichten gehen an die Request-URL.',
    savedButtons: 'Buttons senden Klicks an die Request-URL.',
    savedOff: 'Buttons und Events sind deaktiviert.',
    requestUrl: 'Request-URL',
    requestUrlHint:
      'Ein Klick auf einen Button ohne Link sendet hierher eine signierte block_actions-Payload, wie bei Slack. Antworte über ihre response_url, um die Nachricht zu ersetzen, zu löschen oder darauf zu antworten.',
    saveFailed: 'Die Request-URL wurde nicht gespeichert.',
    publicUrl: 'Verwende eine öffentliche https-URL.',
    events: 'Nachrichten als Events senden',
    eventsHint:
      'Jede Nachricht eines Mitglieds in diesem Kanal geht als signierter event_callback an die Request-URL (app_mention, wenn sie @{{name}} nennt). Mit dem Geheimnis der Webhook-URL lassen sich dann auch der Kanal und seine Threads lesen.',
    remove: 'Request-URL entfernen',
  },
  secret: {
    label: 'Signing Secret',
    copy: 'Signing Secret kopieren',
    copied: 'Signing Secret kopiert',
    reveal: 'Anzeigen',
    makeNew: 'Neu erzeugen',
    rotateTitle: 'Neues Signing Secret erzeugen?',
    rotateDescription:
      'Klicks werden sofort mit dem neuen Secret signiert. Der Empfänger muss sie damit prüfen.',
    rotateConfirm: 'Neues Secret erzeugen',
    loadFailed: 'Das Signing Secret konnte nicht gelesen werden.',
  },
  deliveries: {
    title: 'Letzte Zustellungen',
    duration: '{{ms}} ms',
    empty: 'Noch nichts gesendet.',
  },
  form: {
    name: 'Name',
    iconUrl: 'Symbol-URL (optional)',
    iconInvalid: 'Verwende eine https://-Bild-URL.',
    saveFailed: 'Der Webhook wurde nicht gespeichert. Versuch es noch einmal.',
    limit_one: 'Ein Kanal kann höchstens {{count}} eingehenden Webhook haben.',
    limit_other: 'Ein Kanal kann höchstens {{count}} eingehende Webhooks haben.',
    forbidden:
      'Nur die Person, die den Kanal erstellt hat, sowie Inhaber und Admins des Arbeitsbereichs können Webhooks verwalten.',
    create: 'Webhook erstellen',
  },
  url: {
    label: 'URL von {{name}}',
    copy: 'URL kopieren',
    copied: 'URL kopiert',
    once: 'Kopier sie jetzt: Orbit zeigt diese URL nur einmal an. Wer sie hat, kann in diesem Kanal posten.',
    tryIt: 'Ausprobieren',
    copyCommand: 'Kopieren',
    commandCopied: 'Befehl kopiert',
  },
} satisfies Translation<typeof source>
