import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Danger, DocumentText, Global, ProfileCircle, ShieldCross } from 'reicon-react'
import type { MailMessageView } from '@orbit/api/generated/types.gen'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const domainOf = (address: string | undefined) => address?.split('@').pop() ?? ''

function Banner({
  kind,
  icon: Icon,
  title,
  variant,
  children,
}: {
  kind: string
  icon: ComponentType<{ className?: string }>
  title: string
  variant?: 'destructive'
  children: ReactNode
}) {
  return (
    <Alert variant={variant} data-kind={kind}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

/**
 * The warnings over a message (spec §8.3): failed authentication (DMARC), a sender that uses a member's name, a
 * message from outside that joined a conversation started inside, an external sender, and a message that could not
 * be read in full.
 */
export function SafetyBanner({ message }: { message: MailMessageView }) {
  const { t } = useTranslation('mail')
  const address = message.from?.address
  const domain = domainOf(address)
  const banners: ReactNode[] = []
  if (message.auth.dmarc === 'fail') {
    banners.push(
      <Banner key="auth" kind="auth" icon={ShieldCross} variant="destructive" title={t('safety.auth.title')}>
        {domain ? t('safety.auth.body', { domain }) : t('safety.auth.bodyNoDomain')}
      </Banner>,
    )
  }
  if (message.lookalike_member) {
    banners.push(
      <Banner key="lookalike" kind="lookalike" icon={ProfileCircle} variant="destructive" title={t('safety.lookalike.title')}>
        {address
          ? t('safety.lookalike.body', { member: message.lookalike_member, address })
          : t('safety.lookalike.bodyNoAddress', { member: message.lookalike_member })}
      </Banner>,
    )
  }
  if (message.external) {
    banners.push(
      <Banner key="joined" kind="joined" icon={Danger} title={t('safety.joined.title')}>
        {t('safety.joined.body')}
      </Banner>,
    )
  } else if (message.from_external) {
    banners.push(
      <Banner key="external" kind="external" icon={Global} title={t('safety.external.title')}>
        {domain ? t('safety.external.body', { domain }) : t('safety.external.bodyNoDomain')}
      </Banner>,
    )
  }
  if (message.warning) {
    banners.push(
      <Banner key="warning" kind="warning" icon={DocumentText} title={t('safety.warning.title')}>
        {message.warning === 'limit' ? t('safety.warning.limit') : t('safety.warning.unreadable')}
      </Banner>,
    )
  }
  if (banners.length === 0) return null
  return <div className="mt-3 flex flex-col gap-2">{banners}</div>
}
