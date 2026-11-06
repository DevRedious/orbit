import type { Translation } from '../../types'
import type source from '../en/common'

export default {
  now: 'maintenant',
  today: 'Aujourd’hui',
  yesterday: 'Hier',
  minutesShort: '{{count}} min',
  hoursShort: '{{count}} h',
  daysShort: '{{count}} j',
  retry: 'Réessayer',
  cancel: 'Annuler',
  clear: 'Effacer',
  close: 'Fermer',
  confirm: 'Confirmer',
  delete: 'Supprimer',
  done: 'OK',
  loading: 'Chargement',
  menu: 'Menu',
  remove: 'Retirer',
  reset: 'Réinitialiser',
  save: 'Enregistrer',
  search: 'Rechercher',
  role: {
    owner: 'Propriétaire',
    admin: 'Administrateur',
    member: 'Membre',
  },
  size: {
    bytes: '{{value}} o',
    kilobytes: '{{value}} Ko',
    megabytes: '{{value}} Mo',
  },
} satisfies Translation<typeof source>
