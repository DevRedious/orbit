import type { Translation } from '../../../types'
import type source from '../../en/chat/conversation'

export default {
  header: {
    search: 'Suchen',
    searchIn: 'In {{title}} suchen',
    closeSearch: 'Suche schließen',
    threads: 'Threads',
    pins: 'Angeheftete Nachrichten',
    files: 'Dateien',
    members: 'Mitglieder',
    options: 'Optionen',
    optionsFor: 'Optionen für {{title}}',
    hasGuests: 'Mit Gästen',
    hasGuestsHint: 'Dieser Kanal hat Gäste: Personen von außerhalb des Arbeitsbereichs',
  },
  view: {
    viewing: 'Du siehst dir {{title}} an. Tritt bei, um Nachrichten zu senden.',
    join: '{{title}} beitreten',
    joinFailed: 'Beitritt zu {{title}} fehlgeschlagen. Versuch es noch einmal.',
    loadFailed: 'Die Nachrichten von {{title}} konnten nicht geladen werden.',
    retry: 'Erneut versuchen',
    messagesIn: 'Nachrichten in {{title}}',
    archived: 'Dieser Kanal ist archiviert. Du kannst ihn lesen, aber keine Nachrichten senden.',
    dropFiles: 'Leg Dateien hier ab, um sie deiner Nachricht hinzuzufügen',
  },
  page: {
    panes: {
      thread: 'Thread',
      search: 'Suche',
      members: 'Mitglieder',
      pins: 'Angeheftete Nachrichten',
      files: 'Dateien',
      threads: 'Threads',
    },
    pane: 'Bereich',
    resizePane: 'Größe des rechten Bereichs ändern',
    browseChannels: 'Kanäle durchsuchen',
    loadFailed: 'Chat konnte nicht geladen werden.',
    retry: 'Erneut versuchen',
    emptyTitle: 'Noch keine Konversationen',
    emptyDescription: 'Tritt einem Kanal bei, um Nachrichten zu lesen und zu schreiben.',
    emptyDescriptionGuest:
      'Als Gast siehst du nur die Kanäle, zu denen du hinzugefügt wurdest. Bitte eine Person, die einen Kanal verwaltet, dich hinzuzufügen.',
    unavailableTitle: 'Diese Konversation ist nicht verfügbar',
    unavailableDescription:
      'Sie ist privat oder existiert nicht. Alle öffentlichen Kanäle findest du unter „Kanäle durchsuchen“.',
    unavailableDescriptionGuest:
      'Sie ist privat oder existiert nicht. Wähle eine Konversation in der Seitenleiste oder bitte eine Person, die den Kanal verwaltet, dich hinzuzufügen.',
    taskFromChannel: 'Erstellt aus [einer Nachricht in #{{channel}}]({{url}}).',
    taskFromDm: 'Erstellt aus [einer Direktnachricht]({{url}}).',
    viewBy: 'Ansicht von {{name}}',
  },
  sections: {
    favorites: 'Favoriten',
    channels: 'Kanäle',
    directMessages: 'Direktnachrichten',
  },
  people: {
    unknown: 'Unbekannt',
    you: '{{name}} (du)',
    formerMember: 'Ehemaliges Mitglied',
  },
  time: {
    justNow: 'gerade eben',
    ago: 'vor {{time}}',
  },
} satisfies Translation<typeof source>
