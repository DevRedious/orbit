import { afterEach, expect, test } from 'bun:test'
import { collabStatusLabel, type CollabState } from '@orbit/editor/collab/session'
import { i18n } from '@/i18n'
import { collabStatusText } from './collabStatus'

const STATUSES: CollabState['status'][] = ['live', 'connecting', 'reset', 'offline', 'lost', 'error']

afterEach(() => i18n.changeLanguage('en'))

test('the English status matches the editor package label', () => {
  for (const status of STATUSES) expect(collabStatusText(status)).toBe(collabStatusLabel({ status } as CollabState))
})

test('the status follows the UI language', async () => {
  await i18n.changeLanguage('fr')
  expect(collabStatusText('offline')).toBe('Hors ligne — les modifications seront synchronisées')
  expect(collabStatusText('reset')).toBe(collabStatusText('connecting'))
})
