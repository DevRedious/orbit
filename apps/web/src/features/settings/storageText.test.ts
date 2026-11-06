import { afterEach, expect, test } from 'bun:test'
import type { StorageFile } from '@orbit/api/generated/types.gen'
import { storageFileLabel, storageFilesPage } from '@orbit/api/storage'
import { i18n } from '@/i18n'
import { storageFileText, storagePageText } from './storageText'

const id = 'file'
const FILES: StorageFile[] = [
  { id, byte_size: 1, name: 'a.png', uses: [{ kind: 'task', title: 'Plan' }, { kind: 'page', title: '' }, { kind: 'channel', title: 'general' }] },
  { id, byte_size: 1, name: null, uses: [{ kind: 'emoji' }, { kind: 'sticker' }] },
  { id, byte_size: 1, name: null, uses: [{ kind: 'private' }] },
  { id, byte_size: 1, name: null, uses: [] },
]

afterEach(() => i18n.changeLanguage('en'))

test('the English text matches the shared package labels', () => {
  for (const file of FILES) expect(storageFileText(file)).toEqual(storageFileLabel(file))
  expect(storagePageText(10, 10, 34)).toBe(storageFilesPage(10, 10, 34).label)
})

test('the text follows the UI language and keeps channel names', async () => {
  await i18n.changeLanguage('fr')
  expect(storageFileText(FILES[0]!).where).toBe('Tâche «\u00a0Plan\u00a0», Page «\u00a0Sans titre\u00a0», #general')
  expect(storageFileText(FILES[3]!)).toEqual({ name: 'Fichier supprimé', where: 'Supprimé · cesse de compter sous un jour' })
  expect(storagePageText(10, 10, 34)).toBe('11–20 sur 34')
})
