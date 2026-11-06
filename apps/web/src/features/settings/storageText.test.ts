import { expect, test } from 'bun:test'
import type { StorageFile } from '@orbit/api/generated/types.gen'
import { storageFileLabel, storageFilesPage } from '@orbit/api/storage'
import { storageFileText, storagePageText } from './storageText'

const id = 'file'
const FILES: StorageFile[] = [
  { id, byte_size: 1, name: 'a.png', uses: [{ kind: 'task', title: 'Plan' }, { kind: 'page', title: '' }, { kind: 'channel', title: 'general' }] },
  { id, byte_size: 1, name: null, uses: [{ kind: 'emoji' }, { kind: 'sticker' }] },
  { id, byte_size: 1, name: null, uses: [{ kind: 'private' }] },
  { id, byte_size: 1, name: null, uses: [] },
]

test('the English text matches the shared package labels', () => {
  for (const file of FILES) expect(storageFileText(file)).toEqual(storageFileLabel(file))
  expect(storagePageText(10, 10, 34)).toBe(storageFilesPage(10, 10, 34).label)
})
