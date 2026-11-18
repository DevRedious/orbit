import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ArrowLeft, DirectInbox, ShieldCross, Sms as Mail, Star, Tag, Trash, Undo } from 'reicon-react'
import { Link } from 'react-router'
import { cn } from 'cn'
import type { MailLabel, MailThreadDetail } from '@orbit/api/generated/types.gen'
import { ColorDot } from '@/components/common/ColorDot'
import { PaneHeader, PaneTitle } from '@/components/common/Pane'
import { Tip } from '@/components/common/Tip'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { printPage } from '@/lib/print'
import { folderLabel } from '@/features/mail/mailLib'
import { MailEmptyState } from './MailEmptyState'
import { MessageItem } from './MessageItem'

/** Which threads of a target have a label. */
export type LabelState = 'all' | 'some' | 'none'

/** The label picker of the open thread and of the bulk bar (`l`). */
export function LabelMenu({
  labels,
  state,
  onToggle,
  open,
  onOpenChange,
  canManage,
}: {
  labels: MailLabel[]
  state: (labelId: string) => LabelState
  onToggle: (labelId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
}) {
  const { t } = useTranslation('mail')
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <Tip label={t('labelMenu.title')} side="bottom">
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={t('labelMenu.title')} />}>
          <Tag className="size-4" />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('labelMenu.title')}</DropdownMenuLabel>
          {labels.map((label) => {
            const current = state(label.id)
            return (
              <DropdownMenuCheckboxItem
                key={label.id}
                checked={current === 'all'}
                data-partial={current === 'some' || undefined}
                onCheckedChange={() => onToggle(label.id)}
              >
                <ColorDot color={label.color} className="size-2" />
                {label.name}
              </DropdownMenuCheckboxItem>
            )
          })}
          {labels.length === 0 ? (
            canManage ? (
              <DropdownMenuItem render={<Link to="/settings/mail/labels" />}>{t('labelMenu.create')}</DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled>{t('labelMenu.none')}</DropdownMenuItem>
            )
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface ThreadActions {
  star: () => void
  markUnread: () => void
  archive: () => void
  spam: () => void
  trash: () => void
  restore: () => void
  toggleLabel: (labelId: string) => void
}

interface ThreadViewProps {
  detail: MailThreadDetail | undefined
  status: 'pending' | 'error' | 'success'
  onRetry: () => void
  labels: MailLabel[]
  labelsById: ReadonlyMap<string, MailLabel>
  canManage: boolean
  onBack: () => void
  actions: ThreadActions
  labelMenuOpen: boolean
  onLabelMenuOpenChange: (open: boolean) => void
}

function HeaderButton({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean }) {
  return (
    <Tip label={label} side="bottom">
      <Button variant="ghost" size="icon-sm" className="text-muted-foreground/70" aria-label={label} aria-pressed={pressed} onClick={onClick}>
        {children}
      </Button>
    </Tip>
  )
}

/** The reading pane: the thread's actions, then its messages, oldest first; only the newest is open at first. */
export function ThreadView({ detail, status, onRetry, labels, labelsById, canManage, onBack, actions, labelMenuOpen, onLabelMenuOpenChange }: ThreadViewProps) {
  const { t } = useTranslation('mail')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  if (!detail) {
    return (
      <>
        <PaneHeader>
          <Button variant="ghost" size="icon-sm" className="hidden text-muted-foreground/70 max-[899px]:inline-flex" aria-label={t('actions.back')} onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        </PaneHeader>
        {status === 'error' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <MailEmptyState
              icon={Mail}
              title={t('thread.loadFailed')}
              description={t('thread.loadFailedDescription')}
              action={
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {t('tryAgain')}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-3 px-5 pt-6">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </>
    )
  }

  const { thread, messages } = detail
  const lastIndex = messages.length - 1
  const subject = thread.subject || t('noSubject')
  const chips = thread.labels.flatMap((id) => labelsById.get(id) ?? [])
  const inTrash = thread.folder === 'trash'
  const inSpam = thread.folder === 'spam'

  return (
    <>
      <PaneHeader>
        <Button variant="ghost" size="icon-sm" className="hidden text-muted-foreground/70 max-[899px]:inline-flex" aria-label={t('actions.back')} onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <PaneTitle className="min-w-0 shrink">{subject}</PaneTitle>
        <span className="flex-1" />
        <HeaderButton label={thread.starred ? t('actions.unstar') : t('actions.star')} pressed={thread.starred} onClick={actions.star}>
          <Star className={cn('size-4', thread.starred && 'fill-[#fcd452] text-[#fcd452]')} />
        </HeaderButton>
        <HeaderButton label={t('actions.markUnread')} onClick={actions.markUnread}>
          <Mail className="size-4" />
        </HeaderButton>
        <LabelMenu
          labels={labels}
          state={(id) => (thread.labels.includes(id) ? 'all' : 'none')}
          onToggle={actions.toggleLabel}
          open={labelMenuOpen}
          onOpenChange={onLabelMenuOpenChange}
          canManage={canManage}
        />
        {thread.folder === 'archive' ? (
          <HeaderButton label={t('actions.moveToInbox')} onClick={actions.archive}>
            <DirectInbox className="size-4" />
          </HeaderButton>
        ) : !inTrash && !inSpam ? (
          <HeaderButton label={t('actions.archive')} onClick={actions.archive}>
            <Archive className="size-4" />
          </HeaderButton>
        ) : null}
        {!inTrash ? (
          <HeaderButton label={inSpam ? t('actions.notSpam') : t('actions.reportSpam')} onClick={actions.spam}>
            {inSpam ? <DirectInbox className="size-4" /> : <ShieldCross className="size-4" />}
          </HeaderButton>
        ) : null}
        {inTrash ? (
          <HeaderButton label={t('actions.restore')} onClick={actions.restore}>
            <Undo className="size-4" />
          </HeaderButton>
        ) : (
          <HeaderButton label={t('actions.moveToTrash')} onClick={actions.trash}>
            <Trash className="size-4" />
          </HeaderButton>
        )}
      </PaneHeader>
      <div data-print-root="" className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[800px] flex-col px-5 pt-6 pb-8">
          <div className="flex flex-wrap items-center gap-2.5 pb-2">
            <h1 className="m-0 text-xl font-semibold break-words text-foreground">{subject}</h1>
            <Badge variant="secondary">{folderLabel(thread.folder)}</Badge>
            {chips.map((label) => (
              <Badge key={label.id} variant="outline">
                <ColorDot color={label.color} />
                {label.name}
              </Badge>
            ))}
          </div>
          {inSpam ? (
            <Alert data-kind="spam" data-print-hide="" className="mt-2">
              <ShieldCross />
              <AlertTitle>{t('thread.inSpam')}</AlertTitle>
              <AlertDescription>{t('thread.inSpamDescription')}</AlertDescription>
              <AlertAction>
                <Button variant="outline" size="sm" onClick={actions.spam}>
                  {t('actions.notSpam')}
                </Button>
              </AlertAction>
            </Alert>
          ) : null}
          {inTrash ? (
            <Alert data-kind="trash" data-print-hide="" className="mt-2">
              <Trash />
              <AlertTitle>{t('thread.inTrash')}</AlertTitle>
              <AlertDescription>{t('thread.inTrashDescription')}</AlertDescription>
              <AlertAction>
                <Button variant="outline" size="sm" onClick={actions.restore}>
                  {t('actions.restore')}
                </Button>
              </AlertAction>
            </Alert>
          ) : null}
          {messages.map((message, index) => {
            const open = expanded[message.id] ?? index === lastIndex
            return (
              <MessageItem
                key={message.id}
                message={message}
                expanded={open}
                onToggle={() => setExpanded((previous) => ({ ...previous, [message.id]: !open }))}
                onPrint={() => printPage(subject)}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
