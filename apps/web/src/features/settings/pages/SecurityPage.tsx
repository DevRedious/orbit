import { useId, useState } from 'react'
import { flushSync } from 'react-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Copy, DocumentDownload, FingerScan, Mobile } from 'reicon-react'
import { ApiProblem } from '@orbit/api/problem'
import type { ConnectedAccount, PasskeyRecord, Provider, TotpSetup } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { ProviderMark } from '@/components/common/icons/ProviderMark'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuthOptions, useConnectedAccounts, useCurrentUser, useDisconnectAccount, useStartProviderSignIn } from '@/features/auth/api'
import { ConfirmWithProvider } from '@/features/auth/components/ConfirmWithProvider'
import { CurrentPassword } from '@/features/auth/components/CurrentPassword'
import { defaultPasskeyName, isPasskeyCancel, passkeysSupported } from '@/features/auth/passkey'
import { PROVIDER_NAMES } from '@/features/auth/providerSignIn'
import {
  useAddPasskey,
  useDeletePasskey,
  useDisableTwoFactor,
  useEnableTotp,
  usePasskeys,
  useRegenerateRecoveryCodes,
  useSetupTotp,
  useTwoFactor,
} from '@/features/settings/api/security'
import { RowIcon, SettingsRow } from '@/features/settings/components/SettingsParts'
import { relativeTime } from '@/lib/format'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'

const WEEK = 7 * 24 * 60 * 60_000

/** "5m ago", "3d ago", or "on Sep 4" for older dates (`relativeTime` gives a short date from a week on). */
function ago(iso: string) {
  const age = Date.now() - new Date(iso).getTime()
  if (age < 60_000) return i18n.t('settings:security.justNow')
  const relative = relativeTime(iso)
  return age < WEEK ? i18n.t('settings:security.ago', { time: relative }) : i18n.t('settings:security.on', { date: relative })
}

type SettingsT = TFunction<'settings'>

/** Where `connect` and `confirm` flows come back to. */
const SECURITY_PATH = '/profile/security'

/** Accounts created with Google or GitHub have no password until they set one. */
function useHasPassword() {
  return useCurrentUser().data?.has_password !== false
}

/** Account view: the authenticator app, recovery codes, passkeys and connected Google / GitHub accounts. */
export function SecurityPage() {
  return (
    <>
      <AuthenticatorCard />
      <PasskeysCard />
      <ConnectedAccountsCard />
    </>
  )
}

type AuthenticatorDialog = 'setup' | 'regenerate' | 'disable' | null

function AuthenticatorCard() {
  const { t } = useTranslation('settings')
  const status = useTwoFactor()
  const [dialog, setDialog] = useState<AuthenticatorDialog>(null)
  const enabled = status.data?.totp_enabled === true
  const close = () => setDialog(null)

  return (
    <SettingsCard
      title={t('security.authenticator.title')}
      description={t('security.authenticator.description')}
      actions={status.data ? (
        enabled ? (
          <>
            <Button type="button" variant="outline" onClick={() => setDialog('regenerate')}>{t('security.authenticator.newCodes')}</Button>
            <Button type="button" variant="destructive" onClick={() => setDialog('disable')}>{t('security.authenticator.turnOff')}</Button>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={() => setDialog('setup')}>{t('security.authenticator.setUp')}</Button>
        )
      ) : undefined}
      flush
    >
      {status.isPending ? <SettingsRow role="status">{t('loading')}</SettingsRow> : null}
      {status.isError ? <SettingsRow role="alert">{t('security.authenticator.loadFailed')} <Button variant="ghost" onClick={() => void status.refetch()}>{t('retry')}</Button></SettingsRow> : null}
      {status.data ? (
        <SettingsRow className="flex-nowrap">
          <RowIcon><Mobile /></RowIcon>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              {t('security.authenticator.twoFactor')}
              {enabled ? <Badge>{t('security.authenticator.on')}</Badge> : <Badge variant="secondary">{t('security.authenticator.off')}</Badge>}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {enabled
                ? t('security.authenticator.codesLeft', { count: status.data.recovery_codes_left })
                : t('security.authenticator.passwordOnly')}
            </span>
          </div>
        </SettingsRow>
      ) : null}
      {dialog === 'setup' ? <SetupTotpDialog onClose={close} /> : null}
      {dialog === 'regenerate' ? <RegenerateCodesDialog onClose={close} /> : null}
      {dialog === 'disable' ? <DisableTwoFactorDialog onClose={close} /> : null}
    </SettingsCard>
  )
}

function SetupTotpDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('settings')
  const setup = useSetupTotp()
  const enable = useEnableTotp()
  const hasPassword = useHasPassword()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState<TotpSetup | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const codeId = useId()

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        {codes ? (
          <RecoveryCodesStep codes={codes} title={t('security.setup.enabledTitle')} onDone={onClose} />
        ) : secret ? (
          <form className="grid gap-4" onSubmit={(event) => {
            event.preventDefault()
            enable.mutate(code.trim(), { onSuccess: setCodes })
          }}>
            <DialogHeader>
              <DialogTitle>{t('security.setup.scanTitle')}</DialogTitle>
              <DialogDescription>{t('security.setup.scanDescription')}</DialogDescription>
            </DialogHeader>
            <img src={secret.qr_code} alt={t('security.setup.qrAlt')} className="size-48 justify-self-center rounded-lg bg-white p-3" />
            <CopyField label={t('security.setup.setupKey')} copyLabel={t('security.setup.copySetupKey')} value={secret.secret} />
            <Field data-invalid={enable.isError ? true : undefined}>
              <FieldLabel htmlFor={codeId}>{t('security.setup.code')}</FieldLabel>
              <Input id={codeId} required autoComplete="one-time-code" inputMode="numeric" spellCheck={false} aria-invalid={enable.isError ? true : undefined} value={code} onChange={(event) => setCode(event.target.value)} />
              {enable.isError ? <FieldError>{problemMessage(enable.error, t('security.setup.enableFailed'))}</FieldError> : null}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
              <Button type="submit" disabled={enable.isPending || !code.trim()}>{enable.isPending ? t('security.setup.turningOn') : t('security.setup.turnOn')}</Button>
            </DialogFooter>
          </form>
        ) : (
          <form className="grid gap-4" onSubmit={(event) => {
            event.preventDefault()
            setup.mutate(hasPassword ? password : null, { onSuccess: setSecret })
          }}>
            <DialogHeader>
              <DialogTitle>{t('security.setup.title')}</DialogTitle>
              <DialogDescription>{hasPassword ? t('security.setup.confirmPassword') : t('security.setup.noPassword')}</DialogDescription>
            </DialogHeader>
            <CurrentPassword returnTo={SECURITY_PATH} hasPassword={hasPassword} value={password} onChange={setPassword} error={setup.error} fallback={t('security.setup.startFailed')} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
              <Button type="submit" disabled={setup.isPending || (hasPassword && !password)}>{setup.isPending ? t('pleaseWait') : t('continue')}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RegenerateCodesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('settings')
  const regenerate = useRegenerateRecoveryCodes()
  const hasPassword = useHasPassword()
  const [password, setPassword] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        {codes ? (
          <RecoveryCodesStep codes={codes} title={t('security.regenerate.title')} onDone={onClose} />
        ) : (
          <form className="grid gap-4" onSubmit={(event) => {
            event.preventDefault()
            regenerate.mutate(hasPassword ? password : null, { onSuccess: setCodes })
          }}>
            <DialogHeader>
              <DialogTitle>{t('security.regenerate.title')}</DialogTitle>
              <DialogDescription>{t('security.regenerate.description')}</DialogDescription>
            </DialogHeader>
            <CurrentPassword returnTo={SECURITY_PATH} hasPassword={hasPassword} value={password} onChange={setPassword} error={regenerate.error} fallback={t('security.regenerate.failed')} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
              <Button type="submit" disabled={regenerate.isPending || (hasPassword && !password)}>{regenerate.isPending ? t('pleaseWait') : t('security.regenerate.submit')}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DisableTwoFactorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('settings')
  const disable = useDisableTwoFactor()
  const hasPassword = useHasPassword()
  const [password, setPassword] = useState('')
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          disable.mutate(hasPassword ? password : null, {
            onSuccess: () => {
              toast(t('security.disable.done'))
              onClose()
            },
          })
        }}>
          <DialogHeader>
            <DialogTitle>{t('security.disable.title')}</DialogTitle>
            <DialogDescription>{t('security.disable.description')}</DialogDescription>
          </DialogHeader>
          <CurrentPassword returnTo={SECURITY_PATH} hasPassword={hasPassword} value={password} onChange={setPassword} error={disable.error} fallback={t('security.disable.failed')} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" variant="destructive" disabled={disable.isPending || (hasPassword && !password)}>{disable.isPending ? t('security.disable.turningOff') : t('security.disable.submit')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A read-only value with a copy button. */
function CopyField({ label, copyLabel, value }: { label: string; copyLabel: string; value: string }) {
  const { t } = useTranslation('settings')
  const id = useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input id={id} readOnly value={value} className="font-mono" onFocus={(event) => event.target.select()} />
        <Button type="button" variant="outline" size="icon" aria-label={copyLabel} onClick={() => void copyText(t, value)}>
          <Copy />
        </Button>
      </div>
    </Field>
  )
}

async function copyText(t: SettingsT, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast(t('security.copied'))
  } catch {
    toast.error(t('security.copyFailed'))
  }
}

function downloadCodes(t: SettingsT, codes: string[]) {
  const text = `${t('security.codes.fileTitle')}\n${t('security.codes.fileHint')}\n\n${codes.join('\n')}\n`
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'orbit-recovery-codes.txt'
  link.click()
  URL.revokeObjectURL(url)
}

function RecoveryCodesStep({ codes, title, onDone }: { codes: string[]; title: string; onDone: () => void }) {
  const { t } = useTranslation('settings')
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {t('security.codes.description')}
        </DialogDescription>
      </DialogHeader>
      <ul aria-label={t('security.codes.aria')} className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-muted p-4 font-mono text-[13px] text-foreground">
        {codes.map((code) => <li key={code}>{code}</li>)}
      </ul>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => void copyText(t, codes.join('\n'))}><Copy />{t('security.codes.copy')}</Button>
        <Button type="button" variant="outline" onClick={() => downloadCodes(t, codes)}><DocumentDownload />{t('security.codes.download')}</Button>
        <Button type="button" onClick={onDone}>{t('security.codes.done')}</Button>
      </DialogFooter>
    </>
  )
}

function PasskeysCard() {
  const { t } = useTranslation('settings')
  const options = useAuthOptions()
  const passkeys = usePasskeys()
  const remove = useDeletePasskey()
  const add = useAddPasskey()
  const [adding, setAdding] = useState(false)
  // Closing the browser prompt is a choice, not a failure.
  const addError = !adding && add.isError && !isPasskeyCancel(add.error) ? problemMessage(add.error, add.error instanceof Error ? add.error.message : t('security.passkeys.addFailed')) : null

  function addPasskey(name: string, password: string | null) {
    add.mutate({
      name,
      password,
      beforePrompt: async () => {
        flushSync(() => setAdding(false))
        await new Promise((resolve) => requestAnimationFrame(resolve))
      },
    }, {
      onSuccess: (passkey) => toast(t('security.passkeys.addedToast', { name: passkey.name })),
    })
  }
  const available = options.data?.passkeys_enabled === true
  const supported = passkeysSupported()
  const list = passkeys.data ?? []

  async function confirmRemove(passkey: PasskeyRecord) {
    const confirmed = await confirmAction({
      title: t('security.passkeys.removeTitle', { name: passkey.name }),
      description: t('security.passkeys.removeDescription'),
      confirmLabel: t('security.passkeys.removeConfirm'),
      danger: true,
    })
    if (!confirmed) return
    remove.mutate(passkey.id, {
      onError: (error) => toast.error(problemMessage(error, t('security.passkeys.removeFailed'))),
    })
  }

  return (
    <SettingsCard
      title={t('security.passkeys.title')}
      description={t('security.passkeys.description')}
      actions={available && supported ? <Button type="button" variant="outline" disabled={add.isPending} onClick={() => { add.reset(); setAdding(true) }}>{t('security.passkeys.add')}</Button> : undefined}
      flush
    >
      <div className="flex flex-col divide-y">
        {options.data && !available ? <SettingsRow className="text-[13px] text-muted-foreground">{t('security.passkeys.needsDomain')}</SettingsRow> : null}
        {available && !supported ? <SettingsRow className="text-[13px] text-muted-foreground">{t('security.passkeys.unsupported')}</SettingsRow> : null}
        {!adding && add.isPending ? <SettingsRow role="status" className="text-[13px] text-muted-foreground">{t('security.passkeys.confirmInBrowser')}</SettingsRow> : null}
        {addError ? <SettingsRow role="alert" className="text-[13px] text-destructive">{addError}</SettingsRow> : null}
        {passkeys.isPending ? <SettingsRow role="status">{t('security.passkeys.loading')}</SettingsRow> : null}
        {passkeys.isError ? <SettingsRow role="alert">{t('security.passkeys.loadFailed')} <Button variant="ghost" onClick={() => void passkeys.refetch()}>{t('retry')}</Button></SettingsRow> : null}
        {passkeys.isSuccess && list.length === 0 && available ? <SettingsRow className="text-[13px] text-muted-foreground">{t('security.passkeys.empty')}</SettingsRow> : null}
        {list.map((passkey) => (
          <SettingsRow key={passkey.id} className="flex-nowrap" data-passkey={passkey.id}>
            <RowIcon><FingerScan /></RowIcon>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13px] font-medium text-foreground">{passkey.name}</span>
              <span className="text-xs text-muted-foreground/70">
                {t('security.passkeys.added', { when: ago(passkey.created_at) })} · {passkey.last_used_at ? t('security.passkeys.lastUsed', { when: ago(passkey.last_used_at) }) : t('security.passkeys.neverUsed')}
              </span>
            </div>
            <Button type="button" variant="ghost" aria-label={t('security.passkeys.removeAria', { name: passkey.name })} disabled={remove.isPending} onClick={() => void confirmRemove(passkey)}>
              {t('remove')}
            </Button>
          </SettingsRow>
        ))}
      </div>
      {adding ? <AddPasskeyDialog add={add} onAdd={addPasskey} onClose={() => setAdding(false)} /> : null}
    </SettingsCard>
  )
}

/** Asks for the name and the password (if the account has one). It closes before the browser prompt opens (see `useAddPasskey`). */
function AddPasskeyDialog({ add, onAdd, onClose }: { add: ReturnType<typeof useAddPasskey>; onAdd: (name: string, password: string | null) => void; onClose: () => void }) {
  const { t } = useTranslation('settings')
  const hasPassword = useHasPassword()
  const [name, setName] = useState(() => defaultPasskeyName())
  const [password, setPassword] = useState('')
  const nameId = useId()
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          onAdd(name.trim(), hasPassword ? password : null)
        }}>
          <DialogHeader>
            <DialogTitle>{t('security.passkeys.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('security.passkeys.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={nameId}>{t('security.passkeys.name')}</FieldLabel>
              <Input id={nameId} required maxLength={64} value={name} onChange={(event) => setName(event.target.value)} />
              <FieldDescription>{t('security.passkeys.nameHint')}</FieldDescription>
            </Field>
            {/* Only the password check fails while the dialog is open. */}
            <CurrentPassword returnTo={SECURITY_PATH} hasPassword={hasPassword} value={password} onChange={setPassword} error={add.error} fallback={t('security.passkeys.addFailed')} />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" disabled={add.isPending || (hasPassword && !password) || !name.trim()}>{add.isPending ? t('security.passkeys.checking') : t('security.passkeys.add')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** A connected account is a new way into the account, so an account with a password confirms it first. */
function ConnectProviderDialog({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const { t } = useTranslation('settings')
  const connect = useStartProviderSignIn()
  const [password, setPassword] = useState('')
  const name = PROVIDER_NAMES[provider]
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          connect.mutate({ provider, intent: 'connect', returnTo: SECURITY_PATH, password })
        }}>
          <DialogHeader>
            <DialogTitle>{t('security.connect.title', { name })}</DialogTitle>
            <DialogDescription>{t('security.connect.description', { name })}</DialogDescription>
          </DialogHeader>
          <CurrentPassword returnTo={SECURITY_PATH} hasPassword value={password} onChange={setPassword} error={connect.error} fallback={t('security.connect.failed')} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" disabled={connect.isPending || connect.isSuccess || !password}>{connect.isPending ? t('pleaseWait') : t('continue')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConnectedAccountsCard() {
  const { t } = useTranslation('settings')
  const options = useAuthOptions()
  const accounts = useConnectedAccounts()
  const hasPassword = useHasPassword()
  const connect = useStartProviderSignIn()
  const disconnect = useDisconnectAccount()
  const [confirming, setConfirming] = useState<Provider | null>(null)
  const configured = options.data?.providers ?? []
  const connected = accounts.data ?? []
  // An account stays listed after an admin removes its provider, so it can still be disconnected.
  const providers = [...configured, ...connected.map((account) => account.provider).filter((provider) => !configured.includes(provider))]
  if (providers.length === 0) return null

  async function confirmDisconnect(account: ConnectedAccount) {
    const name = PROVIDER_NAMES[account.provider]
    const confirmed = await confirmAction({
      title: t('security.accounts.disconnectTitle', { name }),
      description: t('security.accounts.disconnectDescription', { name }),
      confirmLabel: t('security.accounts.disconnect'),
      danger: true,
    })
    if (!confirmed) return
    connect.reset()
    disconnect.mutate(account.provider, { onSuccess: () => toast(t('security.accounts.disconnected', { name })) })
  }

  function connectProvider(provider: Provider) {
    disconnect.reset()
    if (hasPassword) setConfirming(provider)
    else connect.mutate({ provider, intent: 'connect', returnTo: SECURITY_PATH })
  }

  return (
    <SettingsCard title={t('security.accounts.title')} description={t('security.accounts.description')} flush>
      <div className="flex flex-col divide-y">
        {disconnect.isError ? <SettingsRow role="alert" className="text-[13px] text-destructive">{problemMessage(disconnect.error, t('security.accounts.disconnectFailed'))}</SettingsRow> : null}
        {connect.error instanceof ApiProblem && connect.error.code === 'reauthentication_required'
          ? <SettingsRow><ConfirmWithProvider returnTo={SECURITY_PATH} /></SettingsRow>
          : connect.isError ? <SettingsRow role="alert" className="text-[13px] text-destructive">{problemMessage(connect.error, t('security.connect.failed'))}</SettingsRow> : null}
        {accounts.isError ? <SettingsRow role="alert">{t('security.accounts.loadFailed')} <Button variant="ghost" onClick={() => void accounts.refetch()}>{t('retry')}</Button></SettingsRow> : null}
        {providers.map((provider) => {
          const account = connected.find((item) => item.provider === provider)
          const name = PROVIDER_NAMES[provider]
          return (
            <SettingsRow key={provider} className="flex-nowrap" data-provider={provider}>
              <RowIcon className="text-foreground"><ProviderMark provider={provider} /></RowIcon>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-foreground">{name}</span>
                <span className="truncate text-xs text-muted-foreground/70">
                  {account ? `${account.email ? `${account.email} · ` : ''}${t('security.accounts.connected', { when: ago(account.created_at) })}` : t('security.accounts.notConnected')}
                </span>
              </div>
              {account ? (
                <Button type="button" variant="ghost" aria-label={t('security.accounts.disconnectAria', { name })} disabled={disconnect.isPending} onClick={() => void confirmDisconnect(account)}>{t('security.accounts.disconnect')}</Button>
              ) : accounts.isSuccess && configured.includes(provider) ? (
                <Button type="button" variant="outline" aria-label={t('security.accounts.connectAria', { name })} disabled={connect.isPending || connect.isSuccess} onClick={() => connectProvider(provider)}>{t('security.accounts.connect')}</Button>
              ) : null}
            </SettingsRow>
          )
        })}
      </div>
      {confirming ? <ConnectProviderDialog provider={confirming} onClose={() => setConfirming(null)} /> : null}
    </SettingsCard>
  )
}
