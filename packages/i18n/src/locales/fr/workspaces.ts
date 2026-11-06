import type { Translation } from '../../types'
import type source from '../en/workspaces'

export default {
  trial: {
    starts: 'Cet espace de travail démarre votre essai gratuit de {{days}} jours. Les espaces de travail suivants le partagent.',
    needsPlan: 'Cet espace de travail a besoin d’une offre avant que vous puissiez y ajouter du contenu.',
    shares: 'Cet espace de travail partage votre essai gratuit, qui se termine le {{date}}.',
    ended: 'Votre essai gratuit s’est terminé le {{date}}. Cet espace de travail reste en lecture seule tant qu’il n’a pas d’offre.',
  },
} satisfies Translation<typeof source>
