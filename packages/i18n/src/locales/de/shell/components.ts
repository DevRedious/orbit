import type { Translation } from '../../../types'
import type source from '../../en/shell/components'

export default {
  attachments: {
    remove: '{{name}} entfernen',
    openImage: 'Bild {{name}} öffnen',
    openFile: '{{name}} öffnen',
    deletedFile: 'Gelöschte Datei',
    deletedByAdmin: '{{name}} · von einem Admin gelöscht',
  },
  codeBlock: {
    diagram: 'Diagramm',
    formula: 'Formel',
    code: 'Code',
    copyCode: 'Code kopieren',
    copy: 'Kopieren',
    copied: 'Kopiert',
    failed: 'Fehlgeschlagen',
    codeCopied: 'Code kopiert',
    copyFailed: 'Code konnte nicht kopiert werden.',
  },
  mermaid: {
    label: 'Diagramm',
    drawing: 'Diagramm wird gezeichnet…',
    empty: 'Das Diagramm ist leer.',
    failed: 'Das Diagramm konnte nicht gezeichnet werden.',
  },
  guestBadge: 'Gast',
  listPager: {
    // The rows shown: "11-20 of 54".
    range: '{{first}}–{{last}} von {{total}}',
    perPage: 'Einträge pro Seite',
    previous: 'Vorherige Seite',
    next: 'Nächste Seite',
  },
  mathFormula: {
    empty: 'Leere Formel',
    drawFailed: 'Die Formel konnte nicht dargestellt werden.',
  },
  pdfViewer: {
    download: 'PDF herunterladen',
    close: 'PDF-Ansicht schließen',
    loading: 'PDF wird geladen',
    failed: 'Dieses PDF kann hier nicht angezeigt werden. Lade es herunter, um es zu öffnen.',
    pageCount_one: '{{count}} Seite',
    pageCount_other: '{{count}} Seiten',
    truncated: 'Die ersten {{limit}} von {{count}} Seiten werden angezeigt. Lade das PDF herunter, um alle zu sehen.',
    page: 'Seite {{number}}',
  },
  // The card shown while the pointer rests on a mention of a person or a task.
  referencePreview: {
    unknownUser: 'Unbekannte Person',
    notMember: 'Kein Mitglied mehr',
    loadFailed: '{{ref}} konnte nicht geladen werden.',
    noTask: 'Keine Aufgabe {{ref}}',
    missing: 'Sie existiert nicht, liegt im Papierkorb oder du kannst sie nicht sehen.',
    loading: '{{ref}} wird geladen…',
    inProject: 'in {{project}}',
    noStatus: 'Kein Status',
    due: 'Fällig am {{date}}',
  },
  colorSwatch: {
    custom: 'Eigene Farbe',
  },
  datePicker: {
    thisWeek: 'Diese Woche',
    nextWeek: 'Nächste Woche',
    time: 'Uhrzeit',
  },
  emojiPicker: {
    search: 'Emoji suchen',
    custom: 'Eigene',
    empty: 'Kein Emoji gefunden',
    pick: 'Emoji auswählen',
    changeSkinTone: 'Hautton ändern',
    skinTone: 'Hautton: {{tone}}. Hautton ändern',
    // Frimousse's skin tone names, for the label above
    skinTones: {
      none: 'keiner',
      light: 'hell',
      'medium-light': 'mittelhell',
      medium: 'mittel',
      'medium-dark': 'mitteldunkel',
      dark: 'dunkel',
    },
  },
  errorBoundary: {
    title: 'Etwas ist schiefgelaufen',
    description: 'Dieser Teil von Orbit funktioniert nicht mehr. Lade die Seite neu, um es noch einmal zu versuchen.',
    reload: 'Neu laden',
  },
  imageViewer: {
    copy: 'Bild kopieren',
    copied: 'Bild kopiert',
    copyFailed: 'Das Bild konnte nicht kopiert werden. Lade es stattdessen herunter.',
    download: 'Bild herunterladen',
    zoomOut: 'Verkleinern',
    resetZoom: 'Zoom zurücksetzen',
    zoomIn: 'Vergrößern',
    close: 'Bildansicht schließen',
  },
  mentionPopover: {
    people: 'Personen',
    channels: 'Kanäle',
    tasks: 'Aufgaben',
    searchingTasks: 'Aufgaben werden gesucht…',
  },
  orbitUnavailable: {
    title: 'Orbit ist nicht erreichbar',
    reconnecting: 'Verbindung wird wiederhergestellt…',
  },
  profileTrigger: {
    open: 'Profil von {{name}} öffnen',
  },
  scopeAccess: {
    access: 'Zugriff',
    none: 'Kein Zugriff',
    read: 'Lesen',
    write: 'Schreiben',
    projects: 'Projekte',
    allProjects: 'Alle Projekte, auch künftige',
    selectAll: 'Alle auswählen',
  },
  spoiler: 'Spoiler',
  unsavedBar: {
    message: 'Du hast ungespeicherte Änderungen.',
    save: 'Änderungen speichern',
  },
  // What a member shows as.
  presence: {
    online: 'Online',
    idle: 'Abwesend',
    dnd: 'Nicht stören',
    offline: 'Offline',
    invisible: 'Unsichtbar',
  },
  ui: {
    breadcrumb: 'Brotkrumennavigation',
    more: 'Mehr',
    commandDialogTitle: 'Befehlspalette',
    commandDialogDescription: 'Suche nach einem Befehl…',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
  },
  // src/lib
  image: 'Bild',
  customTheme: {
    // A custom theme that is not one of the presets.
    yourColors: 'Deine Farben',
  },
  messagePreview: {
    sticker: 'Sticker',
    file: 'Hat eine Datei gesendet',
  },
  soundSets: {
    pop: 'Plopp',
    knock: 'Klopfen',
    chime: 'Glockenspiel',
  },
  imageProblems: {
    type: 'Wähle ein PNG-, JPEG-, WebP- oder GIF-Bild.',
    emojiTooLarge: 'Das Bild ist zu groß. Die Grenze liegt bei 256 KB.',
    stickerTooLarge: 'Das Bild ist zu groß. Die Grenze liegt bei 512 KB.',
    emojiName: 'Ein Name hat 2 bis 32 Zeichen: Kleinbuchstaben, Ziffern und Unterstriche.',
    emojiTaken: ':{{name}}: gibt es schon. Wähle einen anderen Namen.',
    stickerName: 'Ein Name hat 2 bis 30 Zeichen.',
    stickerTaken: 'Einen Sticker namens {{name}} gibt es schon. Wähle einen anderen Namen.',
  },
} satisfies Translation<typeof source>
