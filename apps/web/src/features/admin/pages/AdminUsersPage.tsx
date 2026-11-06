import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Copy } from 'reicon-react'
import type { AdminUser } from '@orbit/api/generated/types.gen'
import { ApiProblem } from '@orbit/api/problem'
import { confirmAction } from '@/components/common/confirmAction'
import { Modal } from '@/components/common/Modal'
import { SettingsCard } from '@/components/common/SettingsCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ADMIN_USER_RESULTS, useAdminUsers, useAdminUserSummary, useChangeUserEmail, useCreateRecoveryLink, useResetTwoFactor, useSetInstanceAdmin, useSetSuspension } from '@/features/admin/api'
import { useAuthOptions, useCurrentUser } from '@/features/auth/api'
import { useIsRoot } from '@/features/workspaces/permissions'
import { SettingsRow } from '@/features/settings/components/SettingsParts'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

/** Orbit Cloud emails the person about a changed email, a password reset and a two-factor reset, so they need a mail server. */
function NoMailServer() {
  const { t } = useTranslation('admin')
  return <span className="block text-xs text-muted-foreground">{t('users.noMailServer')}</span>
}

/** The number of accounts and, on Orbit Cloud, of workspaces on a trial and with an expired trial. */
function SummaryCard() {
  const { t } = useTranslation('admin')
  const summary = useAdminUserSummary().data
  const stats = [
    { label: t('users.overview.users'), value: summary?.users },
    ...(summary?.trials ? [
      { label: t('users.overview.trialsOngoing'), value: summary.trials.ongoing },
      { label: t('users.overview.trialsExpired'), value: summary.trials.expired },
    ] : []),
  ]
  return (
    <SettingsCard title={t('users.overview.title')} description={t('users.overview.description')} flush>
      <dl className="grid grid-flow-col auto-cols-fr divide-x">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1 px-4 py-3">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="text-xl font-semibold text-foreground tabular-nums">{stat.value ?? '–'}</dd>
          </div>
        ))}
      </dl>
    </SettingsCard>
  )
}

/**
 * Accounts on the instance, found by a search on the server; the page lists nobody until you search. Nobody manages the root account, their own account or
 * a deleted one here, except that an admin may change their own email; only the root user manages instance admins
 * (the server enforces the same rules).
 */
export function AdminUsersPage() {
  const { t } = useTranslation('admin')
  const suspension = useSetSuspension()
  const recovery = useCreateRecoveryLink()
  const instanceAdmin = useSetInstanceAdmin()
  const twoFactorReset = useResetTwoFactor()
  const viewerIsRoot = useIsRoot()
  const viewerId = useCurrentUser().data?.id
  const options = useAuthOptions().data
  const cloud = options?.billing_enabled === true
  const mailBlocked = cloud && !options.email_enabled
  const [link, setLink] = useState<{ user: AdminUser; url: string; expiresAt: string } | null>(null)
  const [emailUser, setEmailUser] = useState<AdminUser | null>(null)
  const [query, setQuery] = useState('')
  const manageable = (user: AdminUser) => !user.deleted && !user.root && user.id !== viewerId && !(user.admin && !viewerIsRoot)
  const search = useDebouncedValue(query.trim(), 250)
  const users = useAdminUsers(search)

  async function suspend(user: AdminUser) {
    const confirmed = await confirmAction({
      title: t('users.suspendTitle', { name: user.display_name }),
      description: t('users.suspendDescription'),
      confirmLabel: t('users.suspend'),
      danger: true,
    })
    if (!confirmed) return
    suspension.mutate({ userId: user.id, suspended: true }, {
      onSuccess: () => toast(i18n.t('admin:users.suspended', { name: user.display_name })),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:users.suspendFailed'))),
    })
  }

  function reinstate(user: AdminUser) {
    suspension.mutate({ userId: user.id, suspended: false }, {
      onSuccess: () => toast(i18n.t('admin:users.reinstated', { name: user.display_name })),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:users.reinstateFailed'))),
    })
  }

  async function setAdmin(user: AdminUser, admin: boolean) {
    if (admin) {
      const confirmed = await confirmAction({
        title: t('users.makeAdminTitle', { name: user.display_name }),
        description: t('users.makeAdminDescription'),
        confirmLabel: t('users.makeAdmin'),
      })
      if (!confirmed) return
    }
    instanceAdmin.mutate({ userId: user.id, admin }, {
      onSuccess: () => toast(admin ? i18n.t('admin:users.nowAdmin', { name: user.display_name }) : i18n.t('admin:users.noLongerAdmin', { name: user.display_name })),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:users.adminFailed'))),
    })
  }

  async function resetTwoFactor(user: AdminUser) {
    const confirmed = await confirmAction({
      title: t('users.resetTwoFactorTitle', { name: user.display_name }),
      description: cloud ? t('users.resetTwoFactorDescriptionCloud') : t('users.resetTwoFactorDescription'),
      confirmLabel: t('users.resetTwoFactor'),
      danger: true,
    })
    if (!confirmed) return
    twoFactorReset.mutate(user.id, {
      onSuccess: () => toast(i18n.t('admin:users.twoFactorOff', { name: user.display_name })),
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:users.twoFactorFailed'))),
    })
  }

  function createLink(user: AdminUser) {
    recovery.mutate(user.id, {
      onSuccess: (created) => {
        if (created.url) setLink({ user, url: created.url, expiresAt: created.expires_at })
        else toast(i18n.t('admin:users.resetEmailSent'), { description: i18n.t('admin:users.sentTo', { email: created.sent_to ?? user.email }) })
      },
      onError: (error) => toast.error(problemMessage(error, cloud ? i18n.t('admin:users.resetEmailFailed') : i18n.t('admin:users.recoveryLinkFailed'))),
    })
  }

  return (
    <>
      <SummaryCard />
      <SettingsCard
        title={t('users.title')}
        actions={<Input type="search" aria-label={t('users.search')} placeholder={t('users.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 w-60 max-sm:w-40" />}
        flush
      >
        <div className="flex flex-col divide-y text-[13px]">
          {!search ? <SettingsRow role="status" className="text-muted-foreground">{t('users.searchPrompt')}</SettingsRow> : null}
          {search && users.isPending ? <SettingsRow role="status">{t('users.searching')}</SettingsRow> : null}
          {users.isError ? <SettingsRow role="alert">{t('users.loadFailed')} <Button variant="ghost" onClick={() => void users.refetch()}>{t('retry')}</Button></SettingsRow> : null}
          {search && users.data?.users.length === 0 ? <SettingsRow role="status">{t('users.noMatch', { search })}</SettingsRow> : null}
          {search ? users.data?.users.map((user) => (
            <SettingsRow key={user.id} className="flex-nowrap" data-admin-user={user.id}>
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="rounded-lg text-[11px] font-semibold">{(user.display_name || user.email).charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                  <span className="truncate">{user.display_name}</span>
                  {user.deleted ? <Badge variant="secondary">{t('deleted')}</Badge> : (
                    <>
                      {user.root ? <Badge>{t('users.badges.root')}</Badge> : user.admin ? <Badge variant="secondary">{t('users.badges.admin')}</Badge> : null}
                      {user.two_factor ? <Badge variant="outline">{t('users.badges.twoFactor')}</Badge> : null}
                      {user.suspended ? <Badge variant="destructive">{t('users.badges.suspended')}</Badge> : null}
                    </>
                  )}
                </span>
                {/* a deleted account's email is a placeholder that frees the address */}
                <span className="truncate text-xs text-muted-foreground">{user.deleted ? t('users.anonymized') : user.email}</span>
              </div>
              <span className="text-xs text-muted-foreground/70 max-[899px]:hidden">
                {t('users.workspaces', { count: user.workspace_count })} · {user.last_active_at ? t('users.activeOn', { date: new Date(user.last_active_at).toLocaleDateString(i18n.language) }) : t('users.neverSignedIn')}
              </span>
              <div className="flex w-24 justify-end">
                {user.deleted || (user.id !== viewerId && !manageable(user)) ? null : (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="text-[11px]" aria-label={t('users.manageLabel', { name: user.display_name })} />}>
                      {t('users.manage')}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-auto min-w-52">
                      <DropdownMenuItem disabled={mailBlocked} onClick={() => setEmailUser(user)}>
                        <span>{t('users.changeEmail')}{mailBlocked ? <NoMailServer /> : null}</span>
                      </DropdownMenuItem>
                      {manageable(user) ? (
                        <>
                          {viewerIsRoot && user.admin ? <DropdownMenuItem onClick={() => void setAdmin(user, false)}>{t('users.removeAdmin')}</DropdownMenuItem> : null}
                          {viewerIsRoot && !user.admin && !user.suspended ? <DropdownMenuItem onClick={() => void setAdmin(user, true)}>{t('users.makeAdmin')}</DropdownMenuItem> : null}
                          {user.suspended ? (
                            <DropdownMenuItem onClick={() => reinstate(user)}>{t('users.reinstate')}</DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem disabled={mailBlocked} onClick={() => createLink(user)}>
                                <span>{cloud ? t('users.sendReset') : t('users.createRecovery')}{mailBlocked ? <NoMailServer /> : null}</span>
                              </DropdownMenuItem>
                              {user.two_factor ? (
                                <DropdownMenuItem disabled={mailBlocked} onClick={() => void resetTwoFactor(user)}>
                                  <span>{t('users.resetTwoFactor')}{mailBlocked ? <NoMailServer /> : null}</span>
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              {/* data-danger (not variant="destructive"): the menu popup forces destructive items to the accent colour */}
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive focus:**:text-destructive"
                                data-danger="true"
                                onClick={() => void suspend(user)}
                              >
                                {t('users.suspend')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </SettingsRow>
          )) : null}
          {search && users.data?.more ? (
            <SettingsRow role="status" className="text-muted-foreground">{t('users.more', { limit: ADMIN_USER_RESULTS })}</SettingsRow>
          ) : null}
        </div>
      </SettingsCard>
      {link ? <RecoveryLinkDialog user={link.user} url={link.url} expiresAt={link.expiresAt} onClose={() => setLink(null)} /> : null}
      {emailUser ? <ChangeEmailDialog user={emailUser} cloud={cloud} onClose={() => setEmailUser(null)} /> : null}
    </>
  )
}

/** Self-hosted only: Orbit Cloud emails the link instead of showing it. */
function RecoveryLinkDialog({ user, url, expiresAt, onClose }: { user: AdminUser; url: string; expiresAt: string; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast(t('recoveryLink.copied'))
    } catch {
      toast.error(t('recoveryLink.copyFailed'))
    }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('recoveryLink.title', { name: user.display_name })}</DialogTitle>
          <DialogDescription>
            {t('recoveryLink.description', { email: user.email, time: new Date(expiresAt).toLocaleTimeString(i18n.language) })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input aria-label={t('recoveryLink.label')} value={url} readOnly onFocus={(event) => event.target.select()} />
          <Button type="button" variant="outline" onClick={() => void copy()}>
            <Copy className="size-3.5" />
            {copied ? t('copied') : t('copy')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A 422 or a taken address is about the field; the rest shows under the form. */
function ChangeEmailDialog({ user, cloud, onClose }: { user: AdminUser; cloud: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const change = useChangeUserEmail()
  const [email, setEmail] = useState('')
  const emailId = useId()
  const problem = change.error instanceof ApiProblem ? change.error : null
  const fieldError = problem !== null && (problem.status === 422 || problem.code === 'email_taken')
  const detail = problemMessage(change.error, t('changeEmail.failed'))

  return (
    <Modal
      title={t('changeEmail.title', { name: user.display_name })}
      description={cloud ? t('changeEmail.descriptionCloud') : t('changeEmail.description')}
      onClose={onClose}
      dismissible={!change.isPending}
      className="sm:max-w-120"
    >
      <form className="grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        change.mutate({ userId: user.id, email: email.trim() }, {
          onSuccess: () => {
            toast(t('changeEmail.changed', { name: user.display_name, email: email.trim() }))
            onClose()
          },
        })
      }}>
        <FieldGroup>
          <Field data-invalid={fieldError || undefined}>
            <FieldLabel htmlFor={emailId}>{t('changeEmail.newEmail')}</FieldLabel>
            <Input id={emailId} type="email" required autoFocus autoComplete="off" aria-invalid={fieldError || undefined} value={email} onChange={(event) => setEmail(event.target.value)} />
            {fieldError ? <FieldError>{detail}</FieldError> : <FieldDescription>{t('changeEmail.now', { email: user.email })}</FieldDescription>}
          </Field>
        </FieldGroup>
        {change.error && !fieldError ? <p role="alert" className="text-[13px] text-destructive">{detail}</p> : null}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" disabled={change.isPending} />}>{t('cancel')}</DialogClose>
          <Button type="submit" disabled={change.isPending || !email.trim()}>{change.isPending ? t('saving') : t('changeEmail.submit')}</Button>
        </DialogFooter>
      </form>
    </Modal>
  )
}
