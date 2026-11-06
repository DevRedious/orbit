import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentText, Download, Folder, Message as MessageIcon } from 'reicon-react'
import { ImageViewer } from '@/components/common/ImageViewer'
import { Tip } from '@/components/common/Tip'
import { Button, buttonVariants } from '@/components/ui/button'
import { useChatContext } from '@/features/chat/api/chatContext'
import { useFiles } from '@/features/chat/api/queries'
import type { Attachment, Message } from '@/features/chat/api/types'
import { relativeAgo } from '@/features/chat/lib/time'
import { useMembers } from '@/features/workspaces/api'
import { formatSize, isImage } from '@/lib/attachmentLib'
import { RightPane, RightPaneBody, RightPaneEmpty, RightPaneError, RightPaneLoading } from './RightPane'
import { useJumpToMessage } from './useJumpToMessage'

interface SharedFile {
  attachment: Attachment
  message: Message
}

/** Everything shared in a conversation: images as a grid, other files as rows, newest first. */
export function FilesPane({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation('chat')
  const { workspaceId } = useChatContext()
  const files = useFiles(conversationId)
  const members = useMembers(workspaceId).data ?? []
  const jump = useJumpToMessage()
  const [viewerImage, setViewerImage] = useState<Attachment | null>(null)

  const shared: SharedFile[] = (files.data ?? []).flatMap((message) => message.attachments.map((attachment) => ({ attachment, message })))
  const images = shared.filter((file) => isImage(file.attachment) && !file.attachment.deleted)
  const others = shared.filter((file) => !isImage(file.attachment) || file.attachment.deleted)
  const authorName = (message: Message) => members.find((member) => member.id === message.authorId)?.name ?? t('panes.unknownAuthor')

  return (
    <RightPane title={t('panes.files.title')}>
      <RightPaneBody>
        {files.isPending ? (
          <RightPaneLoading />
        ) : files.isError ? (
          <RightPaneError title={t('panes.files.loadFailed')} onRetry={() => void files.refetch()} />
        ) : shared.length === 0 ? (
          <RightPaneEmpty icon={Folder} title={t('panes.files.emptyTitle')} description={t('panes.files.emptyDescription')} />
        ) : (
          <div className="flex flex-col gap-3">
            {images.length > 0 ? (
              <section aria-label={t('panes.files.images')}>
                <h3 className="px-2 py-1 text-xs text-muted-foreground">{t('panes.files.images')}</h3>
                <ul className="grid grid-cols-3 gap-1 px-2">
                  {images.map(({ attachment, message }) => (
                    <li key={attachment.id} className="group relative aspect-square overflow-hidden rounded-md border">
                      <Tip label={`${attachment.fileName} · ${authorName(message)} · ${relativeAgo(message.createdAt)}`}>
                        <Button
                          variant="ghost"
                          className="block size-full rounded-none border-0 p-0 active:not-aria-[haspopup]:translate-y-0"
                          aria-label={t('panes.files.openImage', { name: attachment.fileName })}
                          onClick={() => setViewerImage(attachment)}
                        >
                          <img src={attachment.url} alt="" loading={attachment.url.startsWith('data:') ? 'eager' : 'lazy'} className="block size-full object-cover" />
                        </Button>
                      </Tip>
                      <Tip label={t('panes.files.goToMessage')}>
                        <Button
                          variant="secondary"
                          size="icon-xs"
                          className="absolute right-1 bottom-1 focus-visible:opacity-100 hover-fine:opacity-0 hover-fine:group-hover:opacity-100"
                          aria-label={t('panes.files.goToMessageWith', { name: attachment.fileName })}
                          onClick={() => jump(message)}
                        >
                          <MessageIcon />
                        </Button>
                      </Tip>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {others.length > 0 ? (
              <section aria-label={t('panes.files.otherFiles')}>
                <h3 className="px-2 py-1 text-xs text-muted-foreground">{t('panes.files.filesHeading')}</h3>
                <ul className="flex flex-col">
                  {others.map(({ attachment, message }) => (
                    <li key={attachment.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover-fine:hover:bg-muted/50">
                      <DocumentText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium" title={attachment.fileName}>
                          {attachment.deleted ? t('panes.files.deletedFile') : attachment.fileName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {attachment.deleted ? attachment.fileName : formatSize(attachment.fileSize)} · {authorName(message)} · {relativeAgo(message.createdAt)}
                        </span>
                      </span>
                      <Tip label={t('panes.files.goToMessage')}>
                        <Button variant="ghost" size="icon-sm" aria-label={t('panes.files.goToMessageWith', { name: attachment.fileName })} onClick={() => jump(message)}>
                          <MessageIcon />
                        </Button>
                      </Tip>
                      {attachment.deleted ? null : <Tip label={t('panes.files.download')}>
                        <a
                          href={attachment.url}
                          download={attachment.fileName}
                          className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                          aria-label={t('panes.files.downloadFile', { name: attachment.fileName })}
                        >
                          <Download />
                        </a>
                      </Tip>}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </RightPaneBody>
      {viewerImage ? <ImageViewer attachment={viewerImage} onClose={() => setViewerImage(null)} /> : null}
    </RightPane>
  )
}
