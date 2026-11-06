import { expect, test } from 'bun:test'
import { problemKey } from './problem'

test('a code with one wording maps to the code', () => {
  expect(problemKey('setup_unavailable', 'This installation has already been initialized.')).toBe('setup_unavailable')
})

test('a code with several wordings maps to the matching one', () => {
  expect(problemKey('invalid_credentials', 'Email or password is incorrect.')).toBe('invalid_credentials.login')
  expect(problemKey('invalid_credentials', 'Current password is incorrect.')).toBe('invalid_credentials.currentPassword')
})

test('an unknown code or wording gives null, so the server text stays', () => {
  expect(problemKey('brand_new_code', 'Something new.')).toBeNull()
  expect(problemKey('invalid_password', 'A reworded message.')).toBeNull()
  expect(problemKey('setup_unavailable', 'Reworded.')).toBeNull()
})

test('inherited object keys are not codes', () => {
  expect(problemKey('toString', 'Inherited keys are not codes.')).toBeNull()
  expect(problemKey('constructor', 'x')).toBeNull()
})

test('a code that became a set of wordings keeps matching its first wording', () => {
  expect(problemKey('invalid_two_factor_code', 'The code is not correct.')).toBe('invalid_two_factor_code.signIn')
  expect(problemKey('storage_quota_exceeded', 'The restored files would take the workspace over its storage quota.')).toBe('storage_quota_exceeded.restore')
  expect(problemKey('chat_forbidden', "Only the channel's creator and workspace owners and admins can do this.")).toBe('chat_forbidden.creator')
})
