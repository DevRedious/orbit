import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export interface ConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReload: () => void
  onOverwrite: () => void
  pending?: boolean
}

export function ConflictDialog({ open, onOpenChange, onReload, onOverwrite, pending = false }: ConflictDialogProps) {
  const { t } = useTranslation('views')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('conflict.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('conflict.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onReload}>{t('conflict.reload')}</Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onOverwrite}>{t('conflict.overwrite')}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
