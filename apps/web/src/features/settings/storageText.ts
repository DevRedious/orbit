import type { StorageFile, StorageFileUse } from '@orbit/api/generated/types.gen'
import { i18n } from '@/i18n'

/**
 * The name and the "where" line of a file in the Storage card's largest files, in the UI language: the web twin of
 * `storageFileLabel` in `@orbit/api/storage`, which stays English for the mobile app.
 */
export function storageFileText(file: StorageFile): { name: string; where: string } {
  if (file.uses.length === 0) return { name: file.name ?? i18n.t('settings:fileStorage.deletedFile'), where: i18n.t('settings:fileStorage.deletedWhere') }
  const places = [...new Set(file.uses.map(usePlace))]
  return { name: file.name ?? i18n.t('settings:fileStorage.privateFile'), where: places.join(', ') }
}

/** The "11–20 of 34" label of a page of the largest files. */
export function storagePageText(offset: number, shown: number, total: number): string {
  return i18n.t('settings:fileStorage.pageRange', { from: offset + 1, to: offset + shown, total })
}

function usePlace(use: StorageFileUse): string {
  const title = use.title || i18n.t('settings:fileStorage.untitled')
  switch (use.kind) {
    case 'task': return i18n.t('settings:fileStorage.uses.task', { title })
    case 'page': return i18n.t('settings:fileStorage.uses.page', { title })
    // a channel name is data
    case 'channel': return `#${use.title ?? ''}`
    case 'emoji': return i18n.t('settings:fileStorage.uses.emoji')
    case 'sticker': return i18n.t('settings:fileStorage.uses.sticker')
    case 'private': return i18n.t('settings:fileStorage.uses.private')
  }
}
