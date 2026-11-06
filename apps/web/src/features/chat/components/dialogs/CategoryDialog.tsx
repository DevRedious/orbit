import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateCategory, useRenameCategory } from '@/features/chat/api/mutations'
import type { Category } from '@/features/chat/api/types'
import { chatErrorMessage } from './channelLib'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category to rename; without it the dialog creates one. */
  category?: Category
}

/** Creates a shared category or renames one. The form is mounted only while the dialog is open. */
export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { t } = useTranslation('chat')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t('dialogs.category.renameTitle') : t('dialogs.category.newTitle')}</DialogTitle>
        </DialogHeader>
        <CategoryForm category={category} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const { t } = useTranslation('chat')
  const createCategory = useCreateCategory()
  const renameCategory = useRenameCategory()
  const [name, setName] = useState(category?.name ?? '')
  const nameId = useId()
  const mutation = category ? renameCategory : createCategory
  const trimmed = name.trim()

  const submit = async () => {
    if (!trimmed || mutation.isPending) return
    if (category && trimmed === category.name) return onDone()
    try {
      if (category) await renameCategory.mutateAsync({ categoryId: category.id, name: trimmed })
      else await createCategory.mutateAsync(trimmed)
      onDone()
    } catch {
      // The form stays; the error shows under the name.
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Field data-invalid={mutation.isError || undefined}>
        <FieldLabel htmlFor={nameId}>{t('dialogs.category.name')}</FieldLabel>
        <Input
          id={nameId}
          autoFocus
          required
          autoComplete="off"
          maxLength={60}
          placeholder={t('dialogs.category.namePlaceholder')}
          value={name}
          aria-invalid={mutation.isError || undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (mutation.isError) mutation.reset()
          }}
        />
        {mutation.isError ? (
          <FieldError>
            {chatErrorMessage(mutation.error, category ? t('dialogs.category.renameFailed') : t('dialogs.category.createFailed'), {
              conflict: t('dialogs.category.conflict'),
              forbidden: t('dialogs.category.forbidden'),
              not_found: t('dialogs.category.notFound'),
            })}
          </FieldError>
        ) : null}
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('dialogs.cancel')}</DialogClose>
        <Button type="submit" disabled={!trimmed || mutation.isPending}>
          {category ? t('dialogs.category.rename') : t('dialogs.category.create')}
        </Button>
      </DialogFooter>
    </form>
  )
}
