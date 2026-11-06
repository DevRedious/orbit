import { toast } from 'sonner'
import { ApiProblem } from '@orbit/api/problem'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useMemo, useState, type ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { confirmAction } from '@/components/common/confirmAction'
import { Notification as Bell, Copy, Add as Plus, Search4 as Search, People as Users, Xmark as X } from 'reicon-react'
import { cn } from 'cn'
import { EmptyState } from '@/components/common/EmptyState'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AvatarStatusBadge } from '@/components/common/UserAvatar'
import { presenceOf, usePresence } from '@/features/realtime/presence'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tip } from '@/components/common/Tip'
import { ListPager, usePagedList } from '@/components/common/ListPager'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthOptions, useCurrentUser } from '@/features/auth/api'
import { useChangeMemberRole, useCreateInvitation, useInvitations, useMembers, useRemoveMember, useRevokeInvitation, useSetMemberCustomRole, useTransferOwnership, useWorkspaceRoles } from '@/features/workspaces/api'
import { useCan } from '@/features/workspaces/permissions'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import type { User } from '@/features/workspaces/models'
import { SettingsCard } from '@/components/common/SettingsCard'
import { FieldGrid, RequiredMark } from '@/features/settings/components/SettingsParts'
import { useSlowPending } from '@/lib/useDebouncedValue'
import { ProfileTrigger } from '@/components/common/ProfileTrigger'
import { loadFailed } from '@/lib/connection'
import { LoadingText } from '@/components/ui/spinner'
import { GuestBadge } from '@/components/common/GuestBadge'
import { GuestChannelsField } from '@/features/settings/components/GuestChannelsField'
import { INVITABLE_ROLES, invitationRequest, type InvitableRole } from '@/features/settings/lib/invitation'
import { problemMessage } from '@/i18n/problem'

type Role = User['role']
type Sort = 'name_asc' | 'name_desc' | 'email_asc' | 'role'

const ROLES: Role[] = ['Owner', 'Admin', 'Member', 'Guest']
const SORT_OPTIONS = [
  { value: 'name_asc', label: 'members.sort.nameAsc' },
  { value: 'name_desc', label: 'members.sort.nameDesc' },
  { value: 'email_asc', label: 'members.sort.emailAsc' },
  { value: 'role', label: 'members.sort.role' },
] as const satisfies ReadonlyArray<{ value: Sort; label: string }>
const ROLE_KEYS = { owner: 'members.roles.owner', admin: 'members.roles.admin', member: 'members.roles.member', guest: 'members.roles.guest' } as const

/** A role in words; a role the app does not know (from the server) shows as it is. */
function roleLabel(t: TFunction<'settings'>, role: string) {
  const key = role.toLowerCase()
  return Object.hasOwn(ROLE_KEYS, key) ? t(ROLE_KEYS[key as keyof typeof ROLE_KEYS]) : role
}
const EMPTY_USERS: User[] = []

function initial(user: User) {
  return (user.name || user.email).charAt(0).toUpperCase()
}

export function MembersPage() {
  const { t, i18n } = useTranslation('settings')
  const { workspace } = useWorkspace()
  const canManage = useCan('members.manage')
  const currentUser = useCurrentUser()
  const emailEnabled = useAuthOptions().data?.email_enabled ?? false
  const presence = usePresence()
  const membersQuery = useMembers(workspace.id)
  const createInvitation = useCreateInvitation(workspace.id)
  const invitations = useInvitations(canManage ? workspace.id : null)
  const revokeInvitation = useRevokeInvitation(workspace.id)
  const changeRole = useChangeMemberRole(workspace.id)
  const removeMember = useRemoveMember(workspace.id)
  const transferOwnership = useTransferOwnership(workspace.id)
  const canManageRoles = useCan('roles.manage')
  const customRoles = useWorkspaceRoles(workspace.id, canManageRoles).data?.items ?? []
  const setCustomRole = useSetMemberCustomRole(workspace.id)
  const memberSaving = useSlowPending(changeRole.isPending || removeMember.isPending || transferOwnership.isPending || setCustomRole.isPending)
  const users = membersQuery.data ?? EMPTY_USERS
  const pendingInvitations = invitations.data?.items.filter((invitation) => invitation.status === 'pending') ?? []

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [sortBy, setSortBy] = useState<Sort>('name_asc')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InvitableRole>('Member')
  const [inviteChannels, setInviteChannels] = useState<string[]>([])
  const [inviteProblem, setInviteProblem] = useState<string | null>(null)
  // The role is the one the link was issued with, not the role picked since.
  const [inviteLink, setInviteLink] = useState<{ url: string; role: InvitableRole } | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  // a custom role adds to the member role only; an admin or owner already holds every grantable permission
  const offersCustomRoles = (user: User) => canManageRoles && user.role === 'Member' && (customRoles.length > 0 || Boolean(user.customRole))

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = users.filter((u) => {
      const matchesSearch =
        !query || [u.name, u.email, u.role, u.customRole?.name ?? ''].some((v) => v.toLowerCase().includes(query))
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
    return list.sort((a, b) => {
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
      if (sortBy === 'email_asc') return a.email.localeCompare(b.email)
      if (sortBy === 'role') return a.role.localeCompare(b.role)
      return a.name.localeCompare(b.name)
    })
  }, [users, search, roleFilter, sortBy])
  const { visible, pager, resetPage } = usePagedList(filtered)

  if (membersQuery.isPending) return <SettingsCard title={t('members.title')}><p><LoadingText>{t('members.loading')}</LoadingText></p></SettingsCard>
  if (loadFailed(membersQuery)) return <SettingsCard title={t('members.title')}><p role="alert">{t('members.loadFailed')}</p></SettingsCard>

  // `items` lets Select.Value render the option label instead of the raw value.
  const roleFilterOptions = [{ value: 'all', label: t('members.allRoles') }, ...ROLES.map((role) => ({ value: role, label: roleLabel(t, role) }))]
  const sortOptions = SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))
  const inviteRoleOptions = INVITABLE_ROLES.map((role) => ({ value: role, label: roleLabel(t, role) }))

  const generateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    const role = inviteRole
    const request = invitationRequest(email, role, inviteChannels, 'manual')
    setInviteProblem('problem' in request ? request.problem : null)
    if ('problem' in request) return
    try {
      const response = await createInvitation.mutateAsync(request.body)
      setInviteLink(response.url ? { url: response.url, role } : null)
      setCopied(false)
    } catch {
      // Mutation feedback remains visible in the form.
    }
  }

  const emailInvitation = async () => {
    const email = inviteEmail.trim()
    if (!email) return
    const request = invitationRequest(email, inviteRole, inviteChannels, 'smtp')
    setInviteProblem('problem' in request ? request.problem : null)
    if ('problem' in request) return
    try {
      await createInvitation.mutateAsync(request.body)
      setInviteLink(null)
      setInviteEmail('')
      toast(t('members.invite.sent', { email }))
    } catch {
      // Mutation feedback remains visible in the form.
    }
  }

  const copyLink = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink.url)
      setCopied(true)
      setCopyError(false)
      toast(t('members.invite.linkCopied'))
    } catch {
      setCopied(false)
      setCopyError(true)
      toast.error(t('members.invite.copyToast'))
    }
  }

  return (
    <>
      <SettingsCard title={t('members.title')} flush>
        <div className="flex items-center justify-between gap-2 border-b p-3 max-[899px]:flex-col max-[899px]:items-stretch">
          <InputGroup className="max-w-96 max-[899px]:max-w-none">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5 text-muted-foreground/70" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              className="text-xs"
              placeholder={t('members.search')}
              aria-label={t('members.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                resetPage()
              }}
            />
            {search ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  className="text-muted-foreground"
                  aria-label={t('members.clearSearch')}
                  onClick={() => {
                    setSearch('')
                    resetPage()
                  }}
                >
                  <X className="size-3" />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          <div className="flex gap-2 max-[899px]:flex-col">
            <Select
              items={roleFilterOptions}
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value as 'all' | Role)
                resetPage()
              }}
            >
              <SelectTrigger aria-label={t('members.filterByRole')} className="w-36 max-[899px]:w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleFilterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              items={sortOptions}
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as Sort)
                resetPage()
              }}
            >
              <SelectTrigger aria-label={t('members.sortMembers')} className="w-40 max-[899px]:w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            <MemberTable>
              <MemberRow kind="header">
                <span>{t('members.columns.name')}</span>
                <span>{t('members.columns.email')}</span>
                <span>{t('members.columns.role')}</span>
                <span className="text-right">{t('members.columns.actions')}</span>
              </MemberRow>
              {visible.map((user) => (
                <MemberRow key={user.id} data-member-row>
                  <div className="flex min-w-0 items-center gap-2">
                    <ProfileTrigger userId={user.id} name={user.name} kind="avatar" tabIndex={-1} className="flex shrink-0">
                      <Avatar size="sm" className="size-7">
                        <AvatarFallback className="rounded-lg text-[0.6875rem] font-semibold">{initial(user)}</AvatarFallback>
                        <AvatarStatusBadge status={presenceOf(presence, user.id).status} size={28} />
                      </Avatar>
                    </ProfileTrigger>
                    <ProfileTrigger userId={user.id} name={user.name} className="truncate text-[0.8125rem] font-medium text-foreground">
                      {user.name}
                    </ProfileTrigger>
                    {user.id === currentUser.data?.id ? (
                      <Badge data-tone="accent">
                        {t('members.you')}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {user.role === 'Guest' ? <GuestBadge className="h-5 text-xs" /> : <Badge variant="secondary">{roleLabel(t, user.role)}</Badge>}
                    {user.customRole ? <Badge variant="outline" className="max-w-full truncate" title={user.customRole.name}>{user.customRole.name}</Badge> : null}
                  </div>
                  <div className="flex justify-end">
                    {/* Your own row has no menu; the abilities themselves come from the server. */}
                    {currentUser.data && user.id !== currentUser.data.id && (user.can.changeRole || user.can.remove || offersCustomRoles(user)) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="outline" size="sm" className="text-[0.6875rem]" />}
                        >
                          {t('members.manage')}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-auto min-w-52">
                          {/* a guest becomes a member (and joins the public channels); nobody becomes a guest */}
                          {user.can.changeRole && user.role === 'Guest' ? (
                            <DropdownMenuItem onClick={() => changeRole.mutate({ membershipId: user.membershipId, version: user.version, role: 'member' })}>
                              Convert to member
                            </DropdownMenuItem>
                          ) : null}
                          {(user.can.changeRole && user.role !== 'Guest' ? (['Admin', 'Member'] as const) : []).filter((role) => role !== user.role).map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => changeRole.mutate({ membershipId: user.membershipId, version: user.version, role: role === 'Admin' ? 'admin' : 'member' })}
                            >
                              {role === 'Admin' ? t('members.makeAdmin') : t('members.makeMember')}
                            </DropdownMenuItem>
                          ))}
                          {offersCustomRoles(user) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Custom role</DropdownMenuLabel>
                                {customRoles.filter((role) => role.id !== user.customRole?.id).map((role) => (
                                  <DropdownMenuItem key={role.id} onClick={() => setCustomRole.mutate({ membershipId: user.membershipId, version: user.version, roleId: role.id })}>
                                    Give {role.name}
                                  </DropdownMenuItem>
                                ))}
                                {user.customRole ? (
                                  <DropdownMenuItem onClick={() => setCustomRole.mutate({ membershipId: user.membershipId, version: user.version, roleId: null })}>
                                    Remove custom role
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuGroup>
                            </>
                          ) : null}
                          {user.can.transferOwnership ? (
                            <DropdownMenuItem onClick={async () => {
                              if (await confirmAction({ title: t('members.transferConfirm', { workspace: workspace.name, name: user.name }), confirmLabel: t('members.transferOwnership'), danger: true })) {
                                transferOwnership.mutate({ membershipId: user.membershipId, membershipVersion: user.version, workspaceVersion: workspace.version })
                              }
                            }}>{t('members.transferOwnership')}</DropdownMenuItem>
                          ) : null}
                          {user.can.remove ? (
                            <>
                              <DropdownMenuSeparator />
                              {/* data-danger (not variant="destructive"): the menu popup forces destructive items to the accent colour */}
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive focus:**:text-destructive"
                                data-danger="true"
                                onClick={() => removeMember.mutate({ membershipId: user.membershipId, version: user.version })}
                              >
                                {t('members.remove')}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </MemberRow>
              ))}
            </MemberTable>
            <ListPager {...pager} />
          </>
        ) : (
          <div className="p-4">
            <EmptyState
              size="sm"
              icon={Users}
              title={t('members.empty.title')}
              description={t('members.empty.description')}
            />
          </div>
        )}
        {changeRole.isError ? <p role="alert" className="text-destructive">{t('members.roleChangeFailed')} <Button variant="ghost" onClick={() => changeRole.variables && changeRole.mutate(changeRole.variables)}>{t('retry')}</Button></p> : null}
        {removeMember.isError ? <p role="alert" className="text-destructive">{t('members.removeFailed')} <Button variant="ghost" onClick={() => removeMember.variables && removeMember.mutate(removeMember.variables)}>{t('retry')}</Button></p> : null}
        {transferOwnership.isError ? <p role="alert" className="text-destructive">{t('members.transferFailed')} <Button variant="ghost" onClick={() => transferOwnership.variables && transferOwnership.mutate(transferOwnership.variables)}>{t('retry')}</Button></p> : null}
        {setCustomRole.isError ? <p role="alert" className="text-destructive">{setCustomRole.error instanceof ApiProblem ? setCustomRole.error.detail : 'The custom role could not be changed.'}</p> : null}
        {memberSaving ? <p role="status">{t('members.saving')}</p> : null}
      </SettingsCard>

      {canManage ? (
        <form id="invitations" onSubmit={(event) => void generateLink(event)}>
          <SettingsCard
            title={t('members.invite.title')}
            description={t('members.invite.description')}
            actions={
              <>
                <Tip label={emailEnabled ? t('members.invite.emailTip') : t('members.invite.emailNotConfigured')}>
                  <Button type="button" variant="outline" disabled={!emailEnabled || createInvitation.isPending} onClick={(event) => { if (event.currentTarget.form?.reportValidity()) void emailInvitation() }}>
                    <Bell className="size-3.5" />
                    {t('members.invite.sendEmail')}
                  </Button>
                </Tip>
                <Button type="submit" disabled={createInvitation.isPending}>
                  <Plus className="size-3.5" />
                  {t('members.invite.generateLink')}
                </Button>
              </>
            }
          >
            <FieldGrid>
              <Field>
                <FieldLabel htmlFor="invite-email">
                  {t('members.invite.email')} <RequiredMark />
                </FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={t('members.invite.emailPlaceholder')}
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-role">
                  {t('members.invite.role')}
                </FieldLabel>
                <Select items={inviteRoleOptions} value={inviteRole} onValueChange={(value) => setInviteRole(value as InvitableRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inviteRoleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGrid>
            {inviteRole === 'Guest' ? <GuestChannelsField value={inviteChannels} onChange={setInviteChannels} /> : null}
            {inviteProblem ? <p role="alert" className="mt-2 text-destructive">{inviteProblem}</p> : null}
            {inviteLink ? (
              <div className="mt-4 flex items-end gap-2">
                <Field>
                  <FieldLabel htmlFor="invite-link">
                    {t('members.invite.link', { role: roleLabel(t, inviteLink.role) })}
                  </FieldLabel>
                  <Input id="invite-link" value={inviteLink.url} readOnly />
                </Field>
                <Button type="button" variant="outline" onClick={copyLink}>
                  <Copy className="size-3.5" />
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
            ) : null}
            {createInvitation.isError ? <p role="alert" className="text-destructive">{problemMessage(createInvitation.error, t('members.invite.failed'))}</p> : null}
            {copyError ? <p role="alert" className="text-destructive">{t('members.invite.copyFailed')}</p> : null}
          </SettingsCard>
        </form>
      ) : null}

      {canManage && invitations.isPending ? <SettingsCard title={t('members.pending.title')}><p><LoadingText>{t('members.pending.loading')}</LoadingText></p></SettingsCard> : null}
      {canManage && invitations.isError ? <SettingsCard title={t('members.pending.title')}><p role="alert">{t('members.pending.loadFailed')} <Button variant="ghost" onClick={() => void invitations.refetch()}>{t('retry')}</Button></p></SettingsCard> : null}
      {canManage && pendingInvitations.length > 0 ? (
        <SettingsCard title={t('members.pending.title')} flush>
          <MemberTable>
            {pendingInvitations.map((invitation) => <MemberRow key={invitation.id}>
              <span className="truncate">{invitation.email}</span><span className="text-xs text-muted-foreground">{t('members.pending.expires', { date: new Date(invitation.expires_at).toLocaleDateString(i18n.language) })}</span><Badge variant="secondary">{roleLabel(t, invitation.role)}</Badge>
              <span className="text-right"><Button variant="ghost" disabled={revokeInvitation.isPending} onClick={() => revokeInvitation.mutate(invitation.id)}>{t('revoke')}</Button></span>
            </MemberRow>)}
          </MemberTable>
        </SettingsCard>
      ) : null}
      {revokeInvitation.isError ? <p role="alert" className="text-destructive">{t('members.pending.revokeFailed')} <Button variant="ghost" onClick={() => revokeInvitation.variables && revokeInvitation.mutate(revokeInvitation.variables)}>{t('retry')}</Button></p> : null}
    </>
  )
}

/** Scrolls sideways on narrow screens instead of squeezing the columns. */
function MemberTable({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="member-table" className={cn('flex max-w-full min-w-0 flex-col overflow-x-auto [overscroll-behavior-x:contain]', className)} {...props} />
}

/** Name · email · role · actions; below 900px the email column hides. */
const memberRowVariants = cva(
  'grid items-center gap-4 px-4 [grid-template-columns:minmax(0,1.15fr)_minmax(0,1.55fr)_7rem_minmax(10rem,0.9fr)] max-[899px]:[grid-template-columns:minmax(0,1fr)_auto_auto] max-[899px]:[&>:nth-child(2)]:hidden',
  {
    variants: {
      kind: {
        header: 'h-10 border-b border-muted bg-black/[0.02] text-[0.8125rem] font-medium text-muted-foreground dark:bg-white/[0.02]',
        row: 'min-h-12 border-b py-2.5 transition-colors last:border-b-0 hover:bg-foreground/[0.02]',
      },
    },
    defaultVariants: { kind: 'row' },
  },
)

function MemberRow({ kind, className, ...props }: ComponentProps<'div'> & VariantProps<typeof memberRowVariants>) {
  return <div data-slot="member-row" data-kind={kind ?? 'row'} className={cn(memberRowVariants({ kind }), className)} {...props} />
}
