import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { cn } from 'cn'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Navigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/common/SettingsCard'
import type { BillingView, PlanInterval, PlanView, SubscriptionStatus, WorkspaceAccess } from '@orbit/api/generated/types.gen'
import { useBillingCheckout, useBillingEnabled, useBillingPortal, useWorkspaceBilling } from '@/features/workspaces/billing'
import { useAuthOptions } from '@/features/auth/api'
import { fullDate } from '@/lib/format'
import { loadFailed } from '@/lib/connection'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

type SettingsT = TFunction<'settings'>

const statusLabel = (t: SettingsT, status: SubscriptionStatus) => t(`billing.statuses.${status}`)
const accessLabel = (t: SettingsT, access: WorkspaceAccess) => t(`billing.accesses.${access}`)
const intervalLabel = (t: SettingsT, interval: PlanInterval) => t(`billing.intervals.${interval}`)

/** A price in minor units, with as many decimals as it needs (`$10`, `$8.33`). The server's currency, the UI language's format. */
function money(minor: number, currency: string) {
  const format = new Intl.NumberFormat(i18n.language, { style: 'currency', currency, minimumFractionDigits: 0 })
  return format.format(minor / 10 ** (format.resolvedOptions().maximumFractionDigits ?? 2))
}

/** One entry per product, in config order: the same plan billed at different intervals. */
function groupByProduct(plans: PlanView[]) {
  const products = new Map<string, PlanView[]>()
  for (const plan of plans) {
    const id = plan.product_id ?? plan.key
    products.set(id, [...(products.get(id) ?? []), plan])
  }
  return [...products.values()]
}

function priced(plans: PlanView[], interval: PlanInterval) {
  return plans.find((plan) => plan.interval === interval && plan.amount != null && plan.currency)
}

/** The smallest whole-percent saving of annual over 12 monthly payments across products, so the label holds for each. */
function annualSaving(products: PlanView[][]) {
  const savings = products.flatMap((plans) => {
    const monthly = priced(plans, 'month')
    const annual = priced(plans, 'year')
    if (!monthly?.amount || !annual?.amount || monthly.currency !== annual.currency) return []
    return [Math.floor((1 - annual.amount / (12 * monthly.amount)) * 100)]
  })
  const saving = savings.length ? Math.min(...savings) : 0
  return saving > 0 ? saving : null
}

function subscribedPlan(t: SettingsT, billing: BillingView) {
  const plan = billing.plans.find((candidate) => candidate.key === billing.plan)
  if (!plan) return billing.plan
  return plan.interval ? t('billing.planWithInterval', { name: plan.name, interval: intervalLabel(t, plan.interval) }) : plan.name
}

function PlanCard({ plan, onChoose, disabled }: { plan: PlanView; onChoose?: () => void; disabled: boolean }) {
  const { t } = useTranslation('settings')
  const price = plan.amount != null && plan.currency ? { amount: plan.amount, currency: plan.currency } : null
  return (
    <div data-slot="plan-card" className="flex flex-col gap-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">{plan.name}</h4>
      {price ? (
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight">{money(price.amount, price.currency)}</span>
            {plan.interval ? <span className="text-xs text-muted-foreground">{t(`billing.perWorkspace.${plan.interval}`)}</span> : null}
          </p>
          {plan.interval === 'year' ? (
            <p className="text-xs text-muted-foreground">{t('billing.billedYearly', { price: money(price.amount / 12, price.currency) })}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{t('billing.unlimited')}</p>
        </div>
      ) : null}
      {onChoose ? (
        <Button className="mt-auto w-full" disabled={disabled} onClick={onChoose}>
          {t('billing.choose', { name: plan.name })}
        </Button>
      ) : null}
    </div>
  )
}

function PlanChooser({ plans, onChoose, disabled }: { plans: PlanView[]; onChoose?: (key: string) => void; disabled: boolean }) {
  const { t } = useTranslation('settings')
  const [period, setPeriod] = useState<PlanInterval>('month')
  const products = groupByProduct(plans)
  const switchable = products.some((group) => priced(group, 'month') && priced(group, 'year'))
  const saving = annualSaving(products)
  return (
    <div className="flex flex-col gap-4">
      {switchable ? (
        <ToggleGroup
          aria-label={t('billing.intervalAria')}
          variant="outline"
          size="sm"
          spacing={0}
          value={[period]}
          onValueChange={(value: string[]) => {
            const next = value[0]
            if (next === 'month' || next === 'year') setPeriod(next)
          }}
        >
          <ToggleGroupItem value="month">{t('billing.intervals.month')}</ToggleGroupItem>
          <ToggleGroupItem value="year">{saving ? t('billing.annualSaving', { percent: saving }) : t('billing.intervals.year')}</ToggleGroupItem>
        </ToggleGroup>
      ) : null}
      <div className={cn('grid gap-3 sm:grid-cols-2', products.length > 2 && 'lg:grid-cols-3')}>
        {products.map((group) => {
          const plan = group.find((candidate) => candidate.interval === period) ?? group[0]
          return <PlanCard key={plan.key} plan={plan} disabled={disabled} onChoose={onChoose ? () => onChoose(plan.key) : undefined} />
        })}
      </div>
    </div>
  )
}

function renewal(t: SettingsT, billing: BillingView) {
  if (!billing.current_period_end || billing.access !== 'full') return null
  const date = fullDate(billing.current_period_end)
  return billing.cancel_at_period_end ? t('billing.endsOn', { date }) : t('billing.renewsOn', { date })
}

/** Orbit Cloud: the workspace's plan. The owner subscribes through Stripe Checkout and manages it in the Billing Portal. */
export function BillingPage() {
  const { t } = useTranslation('settings')
  const options = useAuthOptions()
  const enabled = useBillingEnabled()
  const query = useWorkspaceBilling()
  const checkout = useBillingCheckout()
  const portal = useBillingPortal()
  const [params, setParams] = useSearchParams()
  const returned = params.get('checkout')
  // Back from Stripe Checkout: keep watching for the subscription after the query parameter is gone.
  const [confirming] = useState(() => returned === 'success')

  useEffect(() => {
    if (!returned) return
    // The id keeps it to one toast when the effect runs again before the parameter is gone (StrictMode).
    if (returned === 'success') toast.success(t('billing.thanks'), { id: 'billing-checkout' })
    setParams({}, { replace: true })
  }, [returned, setParams, t])

  // Stripe confirms through the webhook a moment after the redirect: look again until access arrives.
  const waiting = confirming && query.data?.access !== 'full'
  const { refetch } = query
  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => void refetch(), 3000)
    const stop = window.setTimeout(() => window.clearInterval(timer), 60_000)
    return () => {
      window.clearInterval(timer)
      window.clearTimeout(stop)
    }
  }, [waiting, refetch])

  if (options.data && !enabled) return <Navigate to="/settings" replace />
  if (loadFailed(query)) return <SettingsCard title={t('billing.title')}>{t('billing.unavailable')}</SettingsCard>
  if (query.data === undefined) return <SettingsCard title={t('billing.title')}>{t('billing.loading')}</SettingsCard>
  const billing = query.data
  const trial = billing.trial
  const error = checkout.error ?? portal.error
  const busy = checkout.isPending || portal.isPending

  return (
    <>
      <SettingsCard
        title={t('billing.title')}
        description={
          billing.exempt
            ? t('billing.exempt')
            : billing.trial_days > 0
              ? t('billing.descriptionTrial', { days: billing.trial_days })
              : t('billing.description')
        }
        actions={
          billing.can_manage && billing.has_customer ? (
            <Button variant="outline" disabled={busy} onClick={() => portal.mutate()}>
              {t('billing.manage')}
            </Button>
          ) : null
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
          <dt className="text-muted-foreground">{t('billing.plan')}</dt>
          <dd>{billing.plan ? subscribedPlan(t, billing) : billing.status ? t('billing.otherPlan') : billing.exempt ? t('billing.included') : t('billing.noPlan')}</dd>
          <dt className="text-muted-foreground">{t('billing.status')}</dt>
          <dd>{billing.status ? statusLabel(t, billing.status) : billing.exempt ? t('billing.noSubscriptionNeeded') : t('billing.notSubscribed')}</dd>
          <dt className="text-muted-foreground">{t('billing.access')}</dt>
          <dd data-access={billing.access}>{accessLabel(t, billing.access)}</dd>
          {trial ? (
            <>
              <dt className="text-muted-foreground">{t('billing.trialEnds')}</dt>
              <dd>{fullDate(trial.ends_at)}</dd>
              <dt className="text-muted-foreground">{t('billing.trialUsage')}</dt>
              <dd>
                <ul>
                  {(['tasks', 'pages', 'members'] as const).map((noun) => (
                    <li key={noun}>
                      {t(`billing.usage.${noun}`, { used: trial[noun].used, limit: trial[noun].limit })}
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
          {renewal(t, billing) ? (
            <>
              <dt className="text-muted-foreground">{billing.cancel_at_period_end ? t('billing.ends') : t('billing.renews')}</dt>
              <dd>{renewal(t, billing)}</dd>
            </>
          ) : null}
        </dl>
        {error ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {problemMessage(error, error.message)}
          </p>
        ) : null}
      </SettingsCard>
      {billing.access !== 'full' ? (
        <SettingsCard title={t('billing.chooseTitle')} description={billing.can_manage ? t('billing.chooseDescription') : undefined}>
          <PlanChooser plans={billing.plans} disabled={busy || waiting} onChoose={billing.can_manage ? (plan) => checkout.mutate(plan) : undefined} />
          {billing.can_manage ? null : <p className="mt-3 text-sm text-muted-foreground">{t('billing.ownerOnly')}</p>}
          {waiting ? <p className="mt-3 text-xs text-muted-foreground">{t('billing.waiting')}</p> : null}
        </SettingsCard>
      ) : null}
    </>
  )
}
