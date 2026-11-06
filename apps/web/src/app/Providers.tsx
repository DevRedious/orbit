import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PAYMENT_REQUIRED_EVENT, UNAUTHORIZED_EVENT } from '@/api/client'
import { ThemeProvider } from '@/lib/theme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { i18n } from '@/i18n'
import { clearExpiredSession } from './authSession'

function UnauthorizedSessionHandler() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    const unauthorized = () => void clearExpiredSession(queryClient, (path) => navigate(path, { replace: true }), `${window.location.pathname}${window.location.search}${window.location.hash}`)
    window.addEventListener(UNAUTHORIZED_EVENT, unauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, unauthorized)
  }, [navigate, queryClient])

  return null
}

/**
 * Orbit Cloud: a write refused because the workspace is read-only or at a trial limit gets one clear toast (callers
 * skip their generic failure toast, see `isPaymentRequired`) with a way to the billing page. `ReadOnlyBanner` fetches
 * the billing state again.
 */
function PaymentRequiredHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    const refused = (event: Event) => {
      const detail = event instanceof CustomEvent && typeof event.detail === 'string' ? event.detail : i18n.t('shell:billing.paymentRequired')
      toast.error(detail, {
        id: PAYMENT_REQUIRED_EVENT,
        action: { label: i18n.t('shell:billing.billingAction'), onClick: () => navigate('/settings/billing') },
      })
    }
    window.addEventListener(PAYMENT_REQUIRED_EVENT, refused)
    return () => window.removeEventListener(PAYMENT_REQUIRED_EVENT, refused)
  }, [navigate])

  return null
}

/** Remounts the UI when the language changes, so text formatted outside hooks (dates, module-level labels) follows it. */
function LanguageBoundary({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  return <Fragment key={i18n.resolvedLanguage}>{children}</Fragment>
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  )

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <UnauthorizedSessionHandler />
            <PaymentRequiredHandler />
            <TooltipProvider>
              <LanguageBoundary>{children}</LanguageBoundary>
            </TooltipProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
