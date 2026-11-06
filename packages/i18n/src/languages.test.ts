import { expect, test } from 'bun:test'
import { isLanguage, matchLanguage } from './languages'

test('a region tag matches its base language', () => {
  expect(matchLanguage(['EN-gb'])).toBe('en')
})

test('the first supported tag wins', () => {
  expect(matchLanguage(['de-DE', 'en'])).toBe('en')
})

test('no supported tag gives null', () => {
  expect(matchLanguage(['de', 'ja-JP'])).toBeNull()
  expect(matchLanguage([])).toBeNull()
})

test('only shipped languages are languages', () => {
  expect(isLanguage('en')).toBe(true)
  expect(isLanguage('de')).toBe(false)
  expect(isLanguage(null)).toBe(false)
})
