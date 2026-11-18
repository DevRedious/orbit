import type { Translation } from '../../types'
import type source from '../en/workspaces'

export default {
  trial: {
    starts: 'Mit diesem Arbeitsbereich beginnt deine {{days}}-tägige kostenlose Testphase. Weitere Arbeitsbereiche teilen sie sich.',
    needsPlan: 'Dieser Arbeitsbereich braucht einen Tarif, bevor du etwas hinzufügen kannst.',
    shares: 'Dieser Arbeitsbereich nutzt deine kostenlose Testphase, die am {{date}} endet.',
    ended: 'Deine kostenlose Testphase ist am {{date}} abgelaufen. Dieser Arbeitsbereich bleibt schreibgeschützt, bis er einen Tarif hat.',
  },
} satisfies Translation<typeof source>
