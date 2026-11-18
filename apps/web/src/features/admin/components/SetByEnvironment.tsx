import { Trans, useTranslation } from 'react-i18next'
import { cn } from 'cn'

/** The note on a setting that an `ORBIT_*` environment variable sets: Admin cannot change it. */
export function SetByEnvironment({ variable, className }: { variable: string; className?: string }) {
  const { t } = useTranslation('admin')
  return (
    <p data-slot="set-by-environment" className={cn('text-xs text-muted-foreground', className)}>
      <Trans t={t} i18nKey="setByEnvironment" values={{ variable }} components={{ code: <code className="font-mono" /> }} />
    </p>
  )
}
