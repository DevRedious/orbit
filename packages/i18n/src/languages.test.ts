import { expect, test } from 'bun:test'
import { isLanguage, matchLanguage } from './languages'

test('a region tag matches its base language', () => {
  expect(matchLanguage(['fr-CA'])).toBe('fr')
  expect(matchLanguage(['EN-gb'])).toBe('en')
})

test('the first supported tag wins', () => {
  expect(matchLanguage(['de-DE', 'fr', 'en'])).toBe('fr')
})

test('no supported tag gives null', () => {
  expect(matchLanguage(['de', 'ja-JP'])).toBeNull()
  expect(matchLanguage([])).toBeNull()
})

test('only shipped languages are languages', () => {
  expect(isLanguage('fr')).toBe(true)
  expect(isLanguage('de')).toBe(false)
  expect(isLanguage(null)).toBe(false)
})
