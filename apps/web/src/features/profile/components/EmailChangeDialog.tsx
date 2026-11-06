import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiProblem } from '@orbit/api/problem'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRequestEmailChange } from '@/features/auth/api'
import { CurrentPassword } from '@/features/auth/components/CurrentPassword'
import { problemMessage } from '@/i18n/problem'

/** A 401 is about the password or the sign-in, a 422 about the address; the rest shows under the form. */
function errorPlace(error: unknown): 'password' | 'email' | 'form' | null {
  if (!error) return null
  if (error instanceof ApiProblem && error.status === 401) return 'password'
  if (error instanceof ApiProblem && error.status === 422) return 'email'
  return 'form'
}

/**
 * Asks for the new address (and the current password, if the account has one). The server emails a link to the new
 * address; the email changes only once it is opened, so the dialog ends on "Check your inbox".
 */
export function EmailChangeDialog({ currentEmail, hasPassword, onClose }: { currentEmail: string; hasPassword: boolean; onClose: () => void }) {
  const { t } = useTranslation('profile')
  const request = useRequestEmailChange()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const emailId = useId()
  const place = errorPlace(request.error)
  const detail = problemMessage(request.error, t('emailChange.failed'))

  return (
    <Modal
      title={sentTo ? t('emailChange.sentTitle') : t('emailChange.title')}
      description={sentTo
        ? t('emailChange.sent', { email: sentTo, current: currentEmail })
        : t('emailChange.description')}
      onClose={onClose}
      dismissible={!request.isPending}
      className="sm:max-w-120"
    >
      {sentTo ? (
        <DialogFooter>
          <DialogClose render={<Button type="button" />}>{t('emailChange.done')}</DialogClose>
        </DialogFooter>
      ) : (
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          const next = email.trim()
          request.mutate({ email: next, password: hasPassword ? password : null }, { onSuccess: () => setSentTo(next) })
        }}>
          <FieldGroup>
            <Field data-invalid={place === 'email' || undefined}>
              <FieldLabel htmlFor={emailId}>{t('emailChange.newEmail')}</FieldLabel>
              <Input id={emailId} type="email" required autoFocus autoComplete="email" aria-invalid={place === 'email' || undefined} value={email} onChange={(event) => setEmail(event.target.value)} />
              {place === 'email' ? <FieldError>{detail}</FieldError> : <FieldDescription>{t('emailChange.now', { email: currentEmail })}</FieldDescription>}
            </Field>
            <CurrentPassword returnTo="/profile" autoFocus={false} hasPassword={hasPassword} value={password} onChange={setPassword} error={place === 'password' ? request.error : null} fallback={t('emailChange.failed')} />
          </FieldGroup>
          {place === 'form' ? <p role="alert" className="text-[13px] text-destructive">{detail}</p> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={request.isPending} />}>{t('cancel')}</DialogClose>
            <Button type="submit" disabled={request.isPending || !email.trim() || (hasPassword && !password)}>{request.isPending ? t('emailChange.sending') : t('emailChange.send')}</Button>
          </DialogFooter>
        </form>
      )}
    </Modal>
  )
}
