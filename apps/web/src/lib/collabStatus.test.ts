import { expect, test } from 'bun:test'
import { collabStatusLabel, type CollabState } from '@orbit/editor/collab/session'
import { collabStatusText } from './collabStatus'

const STATUSES: CollabState['status'][] = ['live', 'connecting', 'reset', 'offline', 'lost', 'error']

test('the English status matches the editor package label', () => {
  for (const status of STATUSES) expect(collabStatusText(status)).toBe(collabStatusLabel({ status } as CollabState))
})

test('a reset reads as connecting', () => {
  expect(collabStatusText('reset')).toBe(collabStatusText('connecting'))
})
