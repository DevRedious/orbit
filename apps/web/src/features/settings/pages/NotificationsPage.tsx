import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Monitor, Mobile as Smartphone } from 'reicon-react'
import type { NotificationPrefs } from '@orbit/api/generated/types.gen'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AWAY_MINUTES, useAwayMinutes } from '@/features/realtime/idle'
import { needsHomeScreen, pushSupported } from '@/features/realtime/push'
import {
  useDisablePush,
  useEnablePush,
  useNotificationPreferences,
  usePushDevices,
  useRemovePushDevice,
  useSaveNotificationPreferences,
  useSendTestPush,
  useThisDeviceEndpoint,
} from '@/features/settings/api/notifications'
import { FieldGrid, RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'
import { shortDate } from '@/lib/format'
import { MIN_VOLUME, playSound, SOUND_SETS, type SoundSet, soundSetLabel, useSoundSettings } from '@/lib/sounds'

/** In display order; the label is `notifications.preferences.<field>`. */
const PREFERENCES = ['direct_messages', 'chat_mentions', 'thread_replies', 'channel_messages', 'task_assigned', 'mentions'] as const satisfies ReadonlyArray<keyof NotificationPrefs>

/** Whether this browser gets notifications, with the button that changes it. */
function ThisDevice() {
  const { t } = useTranslation('settings')
  const devices = usePushDevices()
  const endpoint = useThisDeviceEndpoint()
  const enable = useEnablePush()
  const disable = useDisablePush()
  const test = useSendTestPush()

  if (needsHomeScreen(navigator.userAgent, (navigator as { standalone?: boolean }).standalone, navigator.maxTouchPoints)) {
    return <p className="text-sm text-muted-foreground">{t('notifications.homeScreen')}</p>
  }
  if (!pushSupported()) return <p className="text-sm text-muted-foreground">{t('notifications.unsupported')}</p>
  if (Notification.permission === 'denied') {
    return (
      <p className="text-sm text-muted-foreground">
        {t('notifications.blocked')}
      </p>
    )
  }
  if (endpoint.isPending || devices.isPending) return <p className="text-sm text-muted-foreground" role="status">{t('notifications.checking')}</p>

  // On only when the server knows this browser too: a device removed elsewhere is off here.
  const on = endpoint.data != null && (devices.data ?? []).some((device) => device.endpoint === endpoint.data)
  const busy = enable.isPending || disable.isPending

  const turnOn = () =>
    enable.mutate(undefined, {
      onSuccess: (result) => {
        if (result === 'dismissed') toast(t('notifications.dismissed'))
      },
      onError: () => toast.error(t('notifications.enableFailed')),
    })
  const turnOff = () => disable.mutate(undefined, { onError: () => toast.error(t('notifications.disableFailed')) })
  const sendTest = () =>
    test.mutate(undefined, {
      onSuccess: (sent) => toast(t('notifications.testSent', { count: sent })),
      onError: () => toast.error(t('notifications.testFailed')),
    })

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{on ? t('notifications.on') : t('notifications.off')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {on ? (
          <>
            <Button type="button" variant="outline" disabled={test.isPending} onClick={sendTest}>{t('notifications.sendTest')}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={turnOff}>{t('notifications.turnOff')}</Button>
          </>
        ) : (
          <Button type="button" disabled={busy} onClick={turnOn}>{t('notifications.turnOn')}</Button>
        )}
      </div>
    </div>
  )
}

function Devices() {
  const { t } = useTranslation('settings')
  const devices = usePushDevices()
  const endpoint = useThisDeviceEndpoint()
  const remove = useRemovePushDevice()
  const list = devices.data ?? []

  return (
    <div className="flex flex-col divide-y">
      {devices.isPending ? <SettingsRow role="status">{t('notifications.devicesLoading')}</SettingsRow> : null}
      {devices.isError ? <SettingsRow role="alert">{t('notifications.devicesFailed')} <Button variant="ghost" onClick={() => void devices.refetch()}>{t('retry')}</Button></SettingsRow> : null}
      {devices.isSuccess && list.length === 0 ? <SettingsRow className="text-sm text-muted-foreground">{t('notifications.noDevices')}</SettingsRow> : null}
      {list.map((device) => (
        <SettingsRow key={device.id} className="flex-nowrap">
          <RowIcon>{/Android|iOS|iPadOS/.test(device.label) ? <Smartphone /> : <Monitor />}</RowIcon>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <span className="truncate">{device.label}</span>
              {device.endpoint === endpoint.data ? <Badge>{t('notifications.thisDeviceBadge')}</Badge> : null}
            </span>
            <span className="text-xs text-muted-foreground/70">{t('notifications.added', { date: shortDate(device.created_at) })}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={remove.isPending}
            onClick={() => remove.mutate(device, { onError: () => toast.error(t('notifications.removeFailed', { name: device.label })) })}
          >
            {t('remove')}
          </Button>
        </SettingsRow>
      ))}
    </div>
  )
}

function Preferences() {
  const { t } = useTranslation('settings')
  const preferences = useNotificationPreferences()
  const save = useSaveNotificationPreferences()
  const current = preferences.data

  if (preferences.isPending) return <p className="text-sm text-muted-foreground" role="status">{t('loading')}</p>
  if (!current) return <p className="text-sm text-muted-foreground" role="alert">{t('notifications.preferencesFailed')} <Button variant="ghost" onClick={() => void preferences.refetch()}>{t('retry')}</Button></p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-border">
        {PREFERENCES.map((field) => {
          const label = t(`notifications.preferences.${field}`)
          return (
          <div key={field} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <Switch
              aria-label={label}
              checked={current[field]}
              onCheckedChange={(checked: boolean) =>
                save.mutate({ ...current, [field]: checked }, { onError: () => toast.error(t('notifications.saveFailed')) })
              }
            />
          </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('notifications.doNotDisturb')}</p>
    </div>
  )
}

function OtherDevices() {
  const { t } = useTranslation('settings')
  const [minutes, setMinutes] = useAwayMinutes()
  const awayOptions = AWAY_MINUTES.map((value) => ({ value: String(value), label: t('notifications.minutes', { count: value }) }))
  return (
    <FieldGrid>
      <Field>
        <FieldLabel htmlFor="away-minutes">{t('notifications.away')}</FieldLabel>
        <Select items={awayOptions} value={String(minutes)} onValueChange={(value) => setMinutes(Number(value))}>
          <SelectTrigger id="away-minutes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {awayOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldDescription>{t('notifications.awayHint')}</FieldDescription>
      </Field>
    </FieldGrid>
  )
}

function Sounds() {
  const { t } = useTranslation('settings')
  const [settings, setSettings] = useSoundSettings()
  // A preview plays with the sound switch off too: the user is choosing what it would sound like.
  const preview = (kind: 'message' | 'mention') => playSound(kind, { ...settings, enabled: true })
  const soundOptions = SOUND_SETS.map((option) => ({ value: option.value, label: soundSetLabel(option.value) }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{t('notifications.playSound')}</span>
        <Switch aria-label={t('notifications.playSound')} checked={settings.enabled} onCheckedChange={(enabled: boolean) => setSettings({ enabled })} />
      </div>
      <FieldGrid>
        <Field>
          <FieldLabel htmlFor="sound-set">{t('notifications.sound')}</FieldLabel>
          <Select items={soundOptions} value={settings.set} onValueChange={(value) => setSettings({ set: value as SoundSet })}>
            <SelectTrigger id="sound-set">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {soundOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="sound-volume">{t('notifications.volume')}</FieldLabel>
          <input
            id="sound-volume"
            type="range"
            className="h-8 w-full accent-primary"
            min={MIN_VOLUME}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(event) => setSettings({ volume: Number(event.target.value) })}
          />
        </Field>
      </FieldGrid>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('notifications.preview')}</span>
        <Button type="button" variant="outline" onClick={() => preview('message')}>{t('notifications.message')}</Button>
        <Button type="button" variant="outline" onClick={() => preview('mention')}>{t('notifications.mention')}</Button>
      </div>
    </div>
  )
}

/** Account view: where and about what Orbit notifies the user. */
export function NotificationsPage() {
  const { t } = useTranslation('settings')
  return (
    <>
      <SettingsCard title={t('notifications.thisDevice.title')} description={t('notifications.thisDevice.description')}>
        <ThisDevice />
      </SettingsCard>
      <SettingsCard title={t('notifications.devices')} flush>
        <Devices />
      </SettingsCard>
      <SettingsCard title={t('notifications.otherDevices.title')} description={t('notifications.otherDevices.description')}>
        <OtherDevices />
      </SettingsCard>
      <SettingsCard title={t('notifications.notifyAbout.title')} description={t('notifications.notifyAbout.description')}>
        <Preferences />
      </SettingsCard>
      <SettingsCard title={t('notifications.sounds.title')} description={t('notifications.sounds.description')}>
        <Sounds />
      </SettingsCard>
    </>
  )
}
