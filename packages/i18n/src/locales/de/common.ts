import type { Translation } from '../../types'
import type source from '../en/common'

export default {
  now: 'jetzt',
  today: 'Heute',
  yesterday: 'Gestern',
  minutesShort: '{{count}} Min.',
  hoursShort: '{{count}} Std.',
  daysShort: '{{count}} T.',
  retry: 'Erneut versuchen',
  cancel: 'Abbrechen',
  clear: 'Leeren',
  close: 'Schließen',
  confirm: 'Bestätigen',
  delete: 'Löschen',
  done: 'Fertig',
  loading: 'Wird geladen',
  // A loading line shown as text, after a spinner.
  loadingText: 'Wird geladen…',
  menu: 'Menü',
  remove: 'Entfernen',
  reset: 'Zurücksetzen',
  save: 'Speichern',
  search: 'Suchen',
  // A page, task or document without a title.
  untitled: 'Ohne Titel',
  // Workspace roles as members see them.
  role: {
    owner: 'Inhaber',
    admin: 'Admin',
    member: 'Mitglied',
  },
  size: {
    bytes: '{{value}} B',
    kilobytes: '{{value}} KB',
    megabytes: '{{value}} MB',
  },
} satisfies Translation<typeof source>
