import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldGrid, SettingsRow } from '@/features/settings/components/SettingsParts'
import { formatBytes } from '@/lib/formatBytes'
import { cacheUsage, clearLocalCache, MEDIA_LIMITS_MB, useMediaLimit } from '@/lib/localCache'

const USAGE_KEY = ['local-cache-usage'] as const

/** Account view: what Orbit keeps on this device, how much it may keep, and the button that removes it. */
export function StoragePage() {
  const { t, i18n } = useTranslation('settings')
  const number = new Intl.NumberFormat(i18n.language)
  const limitOptions = MEDIA_LIMITS_MB.map((megabytes) => ({
    value: String(megabytes),
    label: megabytes >= 1000 ? t('deviceStorage.gigabytes', { value: number.format(megabytes / 1000) }) : t('deviceStorage.megabytes', { value: number.format(megabytes) }),
  }))
  const queryClient = useQueryClient()
  const [limit, setLimit] = useMediaLimit()
  const usage = useQuery({ queryKey: USAGE_KEY, queryFn: cacheUsage, staleTime: 0, gcTime: 0 })
  const clear = useMutation({
    mutationFn: clearLocalCache,
    onSuccess: () => toast.success(t('deviceStorage.cleared')),
    onError: () => toast.error(t('deviceStorage.clearFailed')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: USAGE_KEY }),
  })

  return (
    <SettingsCard
      title={t('deviceStorage.title')}
      description={t('deviceStorage.description')}
      actions={
        <Button type="button" variant="outline" disabled={clear.isPending} onClick={() => clear.mutate()}>
          {t('deviceStorage.clear')}
        </Button>
      }
      flush
    >
      <div className="flex flex-col divide-y">
        <SettingsRow className="justify-between">
          <span className="text-[13px] font-medium text-foreground">{t('deviceStorage.messages')}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{usage.data ? t('deviceStorage.lists', { count: usage.data.entries, size: formatBytes(usage.data.entryBytes) }) : '…'}</span>
        </SettingsRow>
        <SettingsRow className="justify-between">
          <span className="text-[13px] font-medium text-foreground">{t('deviceStorage.images')}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {usage.data ? t('deviceStorage.files', { count: usage.data.mediaFiles, size: formatBytes(usage.data.mediaBytes), limit: formatBytes(limit * 1_000_000) }) : '…'}
          </span>
        </SettingsRow>
        <div className="p-4">
          <FieldGrid>
            <Field>
              <FieldLabel htmlFor="media-limit">{t('deviceStorage.space')}</FieldLabel>
              <Select
                items={limitOptions}
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value))
                  void queryClient.invalidateQueries({ queryKey: USAGE_KEY })
                }}
              >
                <SelectTrigger id="media-limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {limitOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldDescription>{t('deviceStorage.hint')}</FieldDescription>
            </Field>
          </FieldGrid>
        </div>
      </div>
    </SettingsCard>
  )
}
