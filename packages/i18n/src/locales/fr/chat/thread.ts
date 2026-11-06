import type { Translation } from '../../../types'
import type source from '../../en/chat/thread'

export default {
  title: 'Fil',
  follow: 'Suivre le fil',
  unfollow: 'Ne plus suivre le fil',
  followingTip: 'Fil suivi. Les nouvelles réponses vous sont notifiées.',
  followTip: 'Suivre pour être notifié des nouvelles réponses',
  followFailed: 'Impossible de suivre le fil. Réessayez.',
  unfollowFailed: 'Impossible d’arrêter de suivre le fil. Réessayez.',
  openFullTip: 'Ouvrir en vue complète',
  openFull: 'Ouvrir le fil en vue complète',
  close: 'Fermer le fil',
  back: 'Retour',
  rootLine: ' · « {{line}} »',
  sidePaneTip: 'Afficher dans le panneau latéral',
  sidePane: 'Afficher le fil dans le panneau latéral',
  actions: 'Actions du fil',
  copyLink: 'Copier le lien',
  linkCopied: 'Lien copié',
  copyFailed: 'Impossible de copier. Réessayez.',
  showIn: 'Afficher dans {{conversation}}',
  archivedNotice: 'Ce salon est archivé. Vous pouvez le lire, mais pas y envoyer de messages.',
  joinToReply: 'Rejoignez le salon pour répondre.',
  loadFailed: 'Impossible de charger ce fil. Il a peut-être été supprimé.',
  tryAgain: 'Réessayer',
} satisfies Translation<typeof source>
