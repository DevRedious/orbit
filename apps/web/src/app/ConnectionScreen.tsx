import { useTranslation } from 'react-i18next'
import { OrbitUnavailable } from '@/components/common/OrbitUnavailable'
import { retryConnection, useConnection } from '@/lib/connection'

/**
 * "Orbit is unavailable" over the whole app when the connection is still down after a minute. The app stays mounted
 * below, so nothing is lost when the connection is back and the screen goes away. Orbit keeps trying by itself.
 */
export function ConnectionScreen() {
  const { phase } = useConnection()
  const { t } = useTranslation('shell')
  if (phase !== 'failed') return null
  return <OrbitUnavailable overlay detail={t('connection.couldNotReconnect')} onRetry={retryConnection} />
}
