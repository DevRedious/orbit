import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { PauseCircle } from 'reicon-react'
import type { MailMeMailbox } from '@orbit/api/generated/types.gen'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Over the thread list when a mailbox in view is suspended: it refuses new mail, and the mail already in it stays
 * readable. Managers get the way to resume it; members learn whom to ask.
 */
export function MailboxNotice({ mailboxes, canManage }: { mailboxes: MailMeMailbox[]; canManage: boolean }) {
  const { t } = useTranslation('mail')
  const navigate = useNavigate()
  const suspended = mailboxes.filter((mailbox) => mailbox.status === 'suspended')
  if (suspended.length === 0) return null
  const [first] = suspended
  const one = suspended.length === 1
  return (
    <Alert data-slot="mailbox-notice" className="m-3 w-auto">
      <PauseCircle />
      <AlertTitle>{one ? t('notice.suspendedOne', { name: first.name }) : t('notice.suspendedSeveral', { count: suspended.length })}</AlertTitle>
      <AlertDescription>
        {[
          one && first.primary_address ? t('notice.refusedTo', { address: first.primary_address }) : t('notice.refusedThem'),
          t('notice.readable'),
          canManage ? null : t('notice.askAdmin'),
        ]
          .filter(Boolean)
          .join(' ')}
      </AlertDescription>
      {canManage ? (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/mail/mailboxes')}>
            {t('notice.resume')}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  )
}
