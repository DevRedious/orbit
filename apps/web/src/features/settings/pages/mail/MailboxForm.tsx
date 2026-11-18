import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { MailboxKind, MailDomain } from '@orbit/api/generated/types.gen'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MemberPicker } from '@/features/chat/components/dialogs/MemberPicker'
import { useCreateMailbox } from '@/features/mail/api/mutations'
import type { User } from '@/features/workspaces/models'
import { mailProblem } from './mailSettingsLib'


/** The address field: the local part, `@` and the domain. */
export function AddressFields({ id, localPart, domainId, domains, onLocalPart, onDomain }: {
  id: string
  localPart: string
  domainId: string
  domains: MailDomain[]
  onLocalPart: (value: string) => void
  onDomain: (value: string) => void
}) {
  const { t } = useTranslation('settings')
  const options = domains.map((domain) => ({ value: domain.id, label: domain.name }))
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <Input id={id} className="w-44" autoComplete="off" placeholder="team" value={localPart} onChange={(event) => onLocalPart(event.target.value.trim().toLowerCase())} />
      <span aria-hidden className="text-muted-foreground">@</span>
      <Select items={options} value={domainId} onValueChange={(value) => onDomain(value as string)}>
        <SelectTrigger aria-label={t('mail.mailboxForm.domain')} className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * **New mailbox**: personal (one owner, who has no personal mailbox yet) or shared (the chosen members read it).
 * `owners` are the members without a personal mailbox.
 */
export function MailboxForm({ domains, members, owners, onDone }: { domains: MailDomain[]; members: User[]; owners: User[]; onDone: () => void }) {
  const { t } = useTranslation('settings')
  const create = useCreateMailbox()
  const ids = useId()
  const kindOptions: { value: MailboxKind; label: string }[] = [
    { value: 'shared', label: t('mail.mailboxForm.kindShared') },
    { value: 'personal', label: t('mail.mailboxForm.kindPersonal') },
  ]
  const [kind, setKind] = useState<MailboxKind>('shared')
  const [name, setName] = useState('')
  const [localPart, setLocalPart] = useState('')
  const [domainId, setDomainId] = useState(domains[0]?.id ?? '')
  const [ownerId, setOwnerId] = useState('')
  /** User ids, as `MemberPicker` takes them. */
  const [readerIds, setReaderIds] = useState<string[]>([])
  const ownerOptions = owners.map((member) => ({ value: member.membershipId, label: `${member.name} (${member.email})` }))
  const ready = name.trim() !== '' && localPart !== '' && domainId !== '' && (kind === 'shared' || ownerId !== '')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready || create.isPending) return
    const memberIds = readerIds.flatMap((userId) => members.find((member) => member.id === userId)?.membershipId ?? [])
    create.mutate({
      kind,
      name: name.trim(),
      domain_id: domainId,
      local_part: localPart,
      owner_membership_id: kind === 'personal' ? ownerId : null,
      member_ids: kind === 'shared' ? memberIds : [],
    }, {
      onSuccess: (mailbox) => { toast(t('mail.mailboxForm.created', { address: mailbox.addresses[0]?.address ?? mailbox.name })); onDone() },
    })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <Field>
        <FieldLabel htmlFor={`${ids}-kind`}>{t('mail.mailboxForm.kind')}</FieldLabel>
        <Select items={kindOptions} value={kind} onValueChange={(value) => setKind(value as MailboxKind)}>
          <SelectTrigger id={`${ids}-kind`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {kindOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      {kind === 'personal' ? (
        <Field>
          <FieldLabel htmlFor={`${ids}-owner`}>{t('mail.mailboxForm.owner')}</FieldLabel>
          <Select
            items={ownerOptions}
            value={ownerId || null}
            onValueChange={(value) => {
              const owner = owners.find((member) => member.membershipId === value)
              setOwnerId((value as string | null) ?? '')
              if (owner && !name.trim()) setName(owner.name)
            }}
          >
            <SelectTrigger id={`${ids}-owner`}><SelectValue placeholder={owners.length ? t('mail.mailboxForm.chooseMember') : t('mail.mailboxForm.everyoneHasOne')} /></SelectTrigger>
            <SelectContent>
              {ownerOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldDescription>{t('mail.mailboxForm.ownerHint')}</FieldDescription>
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor={`${ids}-name`}>{t('mail.mailboxForm.name')}</FieldLabel>
        <Input id={`${ids}-name`} maxLength={80} placeholder={kind === 'shared' ? t('mail.mailboxForm.namePlaceholderShared') : t('mail.mailboxForm.namePlaceholderPersonal')} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${ids}-local`}>{t('mail.mailboxForm.address')}</FieldLabel>
        <AddressFields id={`${ids}-local`} localPart={localPart} domainId={domainId} domains={domains} onLocalPart={setLocalPart} onDomain={setDomainId} />
        <FieldDescription>{t('mail.mailboxForm.plusHint', { local: localPart || t('mail.mailboxForm.plusHintName') })}</FieldDescription>
      </Field>
      {kind === 'shared' ? (
        <Field>
          <FieldLabel>{t('mail.mailboxForm.members')}</FieldLabel>
          <MemberPicker label={t('mail.mailboxForm.members')} people={members} selectedIds={readerIds} onChange={setReaderIds} />
          <FieldDescription>{t('mail.mailboxForm.membersHint')}</FieldDescription>
        </Field>
      ) : null}
      {create.isError ? <p role="alert" className="text-sm text-destructive">{mailProblem(create.error, t('mail.mailboxForm.createFailed'))}</p> : null}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={!ready || create.isPending}>{create.isPending ? t('mail.creating') : t('mail.mailboxForm.create')}</Button>
      </DialogFooter>
    </form>
  )
}
