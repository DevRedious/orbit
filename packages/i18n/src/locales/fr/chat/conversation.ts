import type { Translation } from '../../../types'
import type source from '../../en/chat/conversation'

export default {
  header: {
    search: 'Rechercher',
    searchIn: 'Rechercher dans {{title}}',
    closeSearch: 'Fermer la recherche',
    threads: 'Fils',
    pins: 'Messages épinglés',
    files: 'Fichiers',
    members: 'Membres',
    options: 'Options',
    optionsFor: 'Options de {{title}}',
  },
  view: {
    viewing: 'Vous consultez {{title}}. Rejoignez-le pour envoyer des messages.',
    join: 'Rejoindre {{title}}',
    joinFailed: 'Impossible de rejoindre {{title}}. Réessayez.',
    loadFailed: 'Impossible de charger les messages de {{title}}.',
    retry: 'Réessayer',
    messagesIn: 'Messages dans {{title}}',
    archived: 'Ce salon est archivé. Vous pouvez le lire, mais pas y envoyer de messages.',
    dropFiles: 'Déposez des fichiers pour les ajouter à votre message',
  },
  page: {
    panes: {
      thread: 'Fil',
      search: 'Recherche',
      members: 'Membres',
      pins: 'Messages épinglés',
      files: 'Fichiers',
      threads: 'Fils',
    },
    pane: 'Volet',
    resizePane: 'Redimensionner le volet de droite',
    browseChannels: 'Parcourir les salons',
    loadFailed: 'Impossible de charger le chat.',
    retry: 'Réessayer',
    emptyTitle: 'Aucune conversation pour l’instant',
    emptyDescription: 'Rejoignez un salon pour commencer à lire et à écrire des messages.',
    unavailableTitle: 'Cette conversation n’est pas disponible',
    unavailableDescription: 'Elle est privée ou n’existe pas. Vous trouverez tous les salons publics dans Parcourir les salons.',
    taskFromChannel: 'Créée à partir d’[un message dans #{{channel}}]({{url}}).',
    taskFromDm: 'Créée à partir d’[un message privé]({{url}}).',
    viewBy: 'Vue de {{name}}',
  },
  sections: {
    favorites: 'Favoris',
    channels: 'Salons',
    directMessages: 'Messages privés',
  },
  people: {
    unknown: 'Inconnu',
    you: '{{name}} (vous)',
    formerMember: 'Ancien membre',
  },
  time: {
    justNow: 'à l’instant',
    ago: 'il y a {{time}}',
  },
} satisfies Translation<typeof source>
