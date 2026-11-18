import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from 'cn'

/** Marks a guest: an outside person who is only in some private channels. */
export function GuestBadge({ className }: { className?: string }) {
  const { t } = useTranslation('shell')
  return (
    <Badge data-slot="guest-badge" variant="outline" className={cn('h-4 px-1.5 text-[0.625rem] text-muted-foreground', className)}>
      {t('guestBadge')}
    </Badge>
  )
}
