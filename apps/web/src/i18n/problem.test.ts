import { expect, test } from 'bun:test'
import { ApiProblem } from '@orbit/api/problem'
import { problemMessage } from './problem'

function problem(code: string, detail: string) {
  return new ApiProblem({ type: 'about:blank', title: 'Problem', status: 400, code, detail, instance: '/', request_id: 'test' })
}

test('a known code and wording shows the catalog message', () => {
  expect(problemMessage(problem('invalid_credentials', 'Email or password is incorrect.'), 'fallback')).toBe('Email or password is incorrect.')
})

test('an unknown code or wording keeps the server text', () => {
  expect(problemMessage(problem('brand_new_code', 'Something new.'), 'fallback')).toBe('Something new.')
  expect(problemMessage(problem('invalid_password', 'A reworded message.'), 'fallback')).toBe('A reworded message.')
})

test('an error that is not an API problem shows the fallback', () => {
  expect(problemMessage(new Error('boom'), 'fallback')).toBe('fallback')
})
