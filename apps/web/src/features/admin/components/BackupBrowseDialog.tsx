import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { BackupItem, BackupItemKind, BackupSummary, RestoredItem } from '@orbit/api/generated/types.gen'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBackupItems, useBackupWorkspaces, useRestoreBackupItem } from '@/features/admin/api'
import { switchWorkspaceHref } from '@/features/workspaces/navigation'
import { useWorkspace } from '@/features/workspaces/workspaceContext'
import { i18n } from '@/i18n'
import { problemMessage } from '@/i18n/problem'
import { relativeTime } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

/** Lists the pages and tasks of one backup and restores one of them as a copy into its live workspace. */
export function BackupBrowseDialog({ backup, onClose }: { backup: BackupSummary; onClose: () => void }) {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const workspaces = useBackupWorkspaces(backup.id)
  const [chosen, setChosen] = useState<string | null>(null)
  const [kind, setKind] = useState<BackupItemKind>('page')
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim(), 250)
  const { workspace: current, workspaces: mine } = useWorkspace()
  const memberOf = new Set(mine.map((workspace) => workspace.id))
  const live = workspaces.data?.filter((workspace) => workspace.live) ?? []
  // The admin's own workspace first: only there can they open the copy.
  const workspaceId = chosen ?? (live.find((workspace) => workspace.id === current.id) ?? live.find((workspace) => memberOf.has(workspace.id)) ?? live[0])?.id ?? null
  const items = useBackupItems(backup.id, workspaceId, kind, search)
  const restore = useRestoreBackupItem(backup.id, workspaceId ?? '')

  function restoreItem(item: BackupItem, includeChildren: boolean) {
    if (!workspaceId) return
    const target = workspaceId
    restore.mutate({ kind: item.kind, id: item.id, include_children: includeChildren }, {
      onSuccess: (restored: RestoredItem) => {
        const url = new URL(restored.path, window.location.origin)
        toast.success(i18n.t('admin:backupBrowse.restored', { title: restored.title }), {
          description: restored.missing_files > 0 ? i18n.t('admin:backupBrowse.missingFiles', { count: restored.missing_files }) : undefined,
          action: memberOf.has(target) ? { label: i18n.t('admin:backupBrowse.open'), onClick: () => navigate(switchWorkspaceHref(url.pathname, url.search, target)) } : undefined,
        })
      },
      onError: (error) => toast.error(problemMessage(error, i18n.t('admin:backupBrowse.restoreFailed'))),
    })
  }

  const names = (workspaces.data ?? []).map((workspace) => workspace.name)
  // Two workspaces can share a name; a short id tells them apart.
  const label = (workspace: { id: string; name: string }) => names.filter((name) => name === workspace.name).length > 1 ? `${workspace.name} · ${workspace.id.slice(-4)}` : workspace.name
  const workspaceItems = (workspaces.data ?? []).map((workspace) => ({ value: workspace.id, label: label(workspace) }))
  const text = kind === 'page'
    ? { tab: t('backupBrowse.page.tab'), search: t('backupBrowse.page.search'), searchPlaceholder: t('backupBrowse.page.searchPlaceholder'), loading: t('backupBrowse.page.loading'), failed: t('backupBrowse.page.failed'), noMatch: t('backupBrowse.page.noMatch', { search }), empty: t('backupBrowse.page.empty') }
    : { tab: t('backupBrowse.task.tab'), search: t('backupBrowse.task.search'), searchPlaceholder: t('backupBrowse.task.searchPlaceholder'), loading: t('backupBrowse.task.loading'), failed: t('backupBrowse.task.failed'), noMatch: t('backupBrowse.task.noMatch', { search }), empty: t('backupBrowse.task.empty') }
  return (
    <Modal
      title={t('backupBrowse.title', { date: new Date(backup.created_at).toLocaleString(i18n.language) })}
      description={t('backupBrowse.description')}
      dismissible={!restore.isPending}
      onClose={onClose}
    >
      {workspaces.isPending ? (
        <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Spinner />
          {t('backupBrowse.opening')}
        </div>
      ) : workspaces.isError ? (
        <div role="alert" className="flex items-center gap-2 py-6 text-sm text-destructive">
          {problemMessage(workspaces.error, t('backupBrowse.openFailed'))}
          <Button variant="ghost" size="sm" onClick={() => void workspaces.refetch()}>{t('retry')}</Button>
        </div>
      ) : workspaces.data.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t('backupBrowse.noWorkspaces')}</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select items={workspaceItems} value={workspaceId} onValueChange={(value) => { if (value) setChosen(value) }}>
              <SelectTrigger aria-label={t('backupBrowse.workspace')} className="w-56 max-sm:w-full">
                <SelectValue placeholder={t('backupBrowse.chooseWorkspace')} />
              </SelectTrigger>
              <SelectContent>
                {workspaces.data.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id} disabled={!workspace.live}>
                    {label(workspace)}
                    {workspace.live ? null : <span className="text-xs text-muted-foreground">{t('deleted')}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={kind} onValueChange={(value) => setKind(value as BackupItemKind)}>
              <TabsList>
                <TabsTrigger value="page">{t('backupBrowse.page.tab')}</TabsTrigger>
                <TabsTrigger value="task">{t('backupBrowse.task.tab')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input type="search" aria-label={text.search} placeholder={text.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 min-w-40 flex-1" />
          </div>
          {workspaceId === null ? (
            <p className="py-6 text-sm text-muted-foreground">{t('backupBrowse.nothingRestorable')}</p>
          ) : items.isPending ? (
            <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Spinner />{text.loading}</div>
          ) : items.isError ? (
            <p role="alert" className="py-6 text-sm text-destructive">{problemMessage(items.error, text.failed)}</p>
          ) : items.data.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{search ? text.noMatch : text.empty}</p>
          ) : (
            <ul aria-label={text.tab} className="-mx-1 flex max-h-[50vh] flex-col divide-y overflow-y-auto text-[13px]">
              {items.data.map((item) => (
                <BackupItemRow
                  key={item.id}
                  item={item}
                  restoring={restore.isPending && restore.variables?.id === item.id}
                  disabled={restore.isPending}
                  onRestore={(includeChildren) => restoreItem(item, includeChildren)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function BackupItemRow({ item, restoring, disabled, onRestore }: { item: BackupItem; restoring: boolean; disabled: boolean; onRestore: (includeChildren: boolean) => void }) {
  const { t } = useTranslation('admin')
  const updated = new Date(item.updated_at).toISOString()
  const meta = (item.kind === 'page'
    ? [item.parent_title ? t('backupBrowse.inParent', { title: item.parent_title }) : null, item.child_count > 0 ? t('backupBrowse.subPages', { count: item.child_count }) : null]
    : [item.project_name, item.number === null ? null : `#${item.number}`]).filter(Boolean).join(' · ')
  return (
    <li className="flex items-center gap-3 px-1 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
          <span className="truncate" title={item.title}>{item.title || t('backupBrowse.untitled')}</span>
          {item.deleted ? <Badge variant="secondary">{t('backupBrowse.inTrash')}</Badge> : null}
        </span>
        <span className="truncate text-xs text-muted-foreground/70">
          {meta ? `${meta} · ` : null}
          <time dateTime={updated} title={new Date(item.updated_at).toLocaleString(i18n.language)}>{relativeTime(updated)}</time>
        </span>
      </div>
      {item.kind === 'page' && item.child_count > 0
        ? <RestorePageButton title={item.title} restoring={restoring} disabled={disabled} onRestore={onRestore} />
        : (
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => onRestore(false)} aria-label={t('backupBrowse.restoreLabel', { title: item.title })}>
            {restoring ? t('backupBrowse.restoring') : t('backupBrowse.restore')}
          </Button>
        )}
    </li>
  )
}

/** A page with sub-pages asks first whether to copy them too. */
function RestorePageButton({ title, restoring, disabled, onRestore }: { title: string; restoring: boolean; disabled: boolean; onRestore: (includeChildren: boolean) => void }) {
  const { t } = useTranslation('admin')
  const [open, setOpen] = useState(false)
  const [includeChildren, setIncludeChildren] = useState(true)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" disabled={disabled} aria-label={t('backupBrowse.restoreLabel', { title })} />}>
        {restoring ? t('backupBrowse.restoring') : t('backupBrowse.restore')}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60">
        <Label className="font-normal">
          <Checkbox checked={includeChildren} onCheckedChange={setIncludeChildren} />
          {t('backupBrowse.includeSubPages')}
        </Label>
        <Button size="sm" onClick={() => { setOpen(false); onRestore(includeChildren) }}>{t('backupBrowse.restore')}</Button>
      </PopoverContent>
    </Popover>
  )
}
