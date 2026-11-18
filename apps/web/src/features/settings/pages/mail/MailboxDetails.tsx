import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { MailDomain, MailMailbox } from '@orbit/api/generated/types.gen'
import { confirmAction } from '@/components/common/confirmAction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MemberPicker } from '@/features/chat/components/dialogs/MemberPicker'
import {
  useAddMailboxAlias,
  useAddMailboxMember,
  useDeleteMailbox,
  useRemoveMailboxAddress,
  useRemoveMailboxMember,
  useSetMailboxStatus,
  useUpdateMailbox,
} from '@/features/mail/api/mutations'
import type { User } from '@/features/workspaces/models'
import { AddressFields } from './MailboxForm'
import { mailProblem } from './mailSettingsLib'

const failed = (fallback: string) => (error: unknown) => toast.error(mailProblem(error, fallback))

/** One mailbox opened from the list: name, addresses, members, suspend and delete. */
export function MailboxDetails({ mailbox, domains, members }: { mailbox: MailMailbox; domains: MailDomain[]; members: User[] }) {
  const { t } = useTranslation('settings')
  const ids = useId()
  const rename = useUpdateMailbox()
  const addAlias = useAddMailboxAlias()
  const removeAddress = useRemoveMailboxAddress()
  const addMember = useAddMailboxMember()
  const removeMember = useRemoveMailboxMember()
  const setStatus = useSetMailboxStatus()
  const remove = useDeleteMailbox()
  const [name, setName] = useState(mailbox.name)
  const [aliasLocal, setAliasLocal] = useState('')
  const [aliasDomain, setAliasDomain] = useState(domains[0]?.id ?? '')
  const ownerLeft = mailbox.kind === 'personal' && !mailbox.owner_membership_id
  const owner = members.find((member) => member.membershipId === mailbox.owner_membership_id)
  const readerIds = mailbox.member_ids.flatMap((membershipId) => members.find((member) => member.membershipId === membershipId)?.id ?? [])

  function saveName(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === mailbox.name) return
    rename.mutate({ mailboxId: mailbox.id, name: trimmed }, { onSuccess: () => toast(t('mail.mailboxDetails.renamed')), onError: failed(t('mail.mailboxDetails.renameFailed')) })
  }

  function submitAlias(event: FormEvent) {
    event.preventDefault()
    if (!aliasLocal || !aliasDomain) return
    addAlias.mutate({ mailboxId: mailbox.id, local_part: aliasLocal, domain_id: aliasDomain }, {
      onSuccess: () => setAliasLocal(''),
      onError: failed(t('mail.mailboxDetails.aliasAddFailed')),
    })
  }

  /** `MemberPicker` reports the whole new list; one person changes at a time. */
  function changeReaders(next: string[]) {
    const added = next.find((userId) => !readerIds.includes(userId))
    const removed = readerIds.find((userId) => !next.includes(userId))
    const membershipOf = (userId: string) => members.find((member) => member.id === userId)?.membershipId
    const addedMembership = added ? membershipOf(added) : undefined
    const removedMembership = removed ? membershipOf(removed) : undefined
    if (addedMembership) addMember.mutate({ mailboxId: mailbox.id, membershipId: addedMembership }, { onError: failed(t('mail.mailboxDetails.memberAddFailed')) })
    if (removedMembership) removeMember.mutate({ mailboxId: mailbox.id, membershipId: removedMembership }, { onError: failed(t('mail.mailboxDetails.memberRemoveFailed')) })
  }

  async function deleteMailbox() {
    const confirmed = await confirmAction({
      title: t('mail.mailboxDetails.deleteTitle', { name: mailbox.name }),
      description: t('mail.mailboxDetails.deleteDescription'),
      confirmLabel: t('delete'),
      danger: true,
    })
    if (confirmed) remove.mutate(mailbox.id, { onSuccess: () => toast(t('mail.mailboxDetails.deleted', { name: mailbox.name })), onError: failed(t('mail.mailboxDetails.deleteFailed')) })
  }

  return (
    <div className="flex flex-col gap-5 border-t bg-muted/30 px-4 py-4">
      <form className="flex flex-wrap items-end gap-2" onSubmit={saveName}>
        <Field className="w-64">
          <FieldLabel htmlFor={`${ids}-name`}>{t('mail.mailboxDetails.name')}</FieldLabel>
          <Input id={`${ids}-name`} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Button type="submit" variant="outline" disabled={!name.trim() || name.trim() === mailbox.name || rename.isPending}>{t('mail.mailboxDetails.rename')}</Button>
      </form>

      <section aria-label={t('mail.mailboxDetails.addresses')} className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">{t('mail.mailboxDetails.addresses')}</h4>
        <ul className="flex flex-col gap-1">
          {mailbox.addresses.map((address) => (
            <li key={address.id} className="flex items-center gap-2 text-[0.8125rem]">
              <span className="min-w-0 truncate font-mono text-xs">{address.address}</span>
              <Badge variant={address.kind === 'primary' ? 'secondary' : 'outline'}>{address.kind === 'primary' ? t('mail.mailboxDetails.primary') : t('mail.mailboxDetails.alias')}</Badge>
              {address.kind === 'alias' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t('mail.mailboxDetails.removeAria', { address: address.address })}
                  disabled={removeAddress.isPending}
                  onClick={() => removeAddress.mutate({ mailboxId: mailbox.id, addressId: address.id }, { onError: failed(t('mail.mailboxDetails.aliasRemoveFailed')) })}
                >
                  {t('remove')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <form className="flex flex-wrap items-center gap-2" onSubmit={submitAlias}>
          <AddressFields id={`${ids}-alias`} localPart={aliasLocal} domainId={aliasDomain} domains={domains} onLocalPart={setAliasLocal} onDomain={setAliasDomain} />
          <Button type="submit" variant="outline" disabled={!aliasLocal || !aliasDomain || addAlias.isPending}>{t('mail.mailboxDetails.addAlias')}</Button>
        </form>
      </section>

      <section aria-label={t('mail.mailboxDetails.members')} className="flex flex-col gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">{mailbox.kind === 'personal' ? t('mail.mailboxDetails.owner') : t('mail.mailboxDetails.members')}</h4>
        {mailbox.kind === 'shared' ? (
          <div className="max-w-md">
            <MemberPicker label={t('mail.mailboxDetails.membersOf', { name: mailbox.name })} people={members} selectedIds={readerIds} onChange={changeReaders} />
          </div>
        ) : (
          <p className="m-0 text-[0.8125rem]">
            {ownerLeft ? t('mail.mailboxDetails.ownerLeft') : (owner ? t('mail.mailboxDetails.ownerOnly', { name: owner.name, email: owner.email }) : t('mail.mailboxDetails.formerMember'))}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {ownerLeft ? null : (
          <Button
            type="button"
            variant="outline"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ mailboxId: mailbox.id, status: mailbox.status === 'active' ? 'suspended' : 'active' }, {
              onSuccess: (updated) => toast(updated.status === 'active' ? t('mail.mailboxDetails.resumed') : t('mail.mailboxDetails.suspended')),
              onError: failed(t('mail.mailboxDetails.changeFailed')),
            })}
          >
            {mailbox.status === 'active' ? t('mail.mailboxDetails.suspend') : t('mail.mailboxDetails.resume')}
          </Button>
        )}
        <span className="flex-1 text-xs text-muted-foreground">
          {mailbox.status === 'active' ? t('mail.mailboxDetails.suspendHint') : t('mail.mailboxDetails.suspendedHint')}
        </span>
        <Button type="button" variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => void deleteMailbox()}>{t('mail.mailboxDetails.delete')}</Button>
      </div>
    </div>
  )
}
