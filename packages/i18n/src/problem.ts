import errors from './locales/en/errors'

type Catalog = typeof errors

/** A key of the `errors` namespace: a code, or `code.wording` when the server words that code in several ways. */
export type ErrorKey = {
  [Code in keyof Catalog]: Catalog[Code] extends string ? Code : `${Code}.${keyof Catalog[Code] & string}`
}[keyof Catalog]

/**
 * The `errors` catalog key for a Problem Details `code` and English `detail`, or `null` when the catalog does not
 * know that exact wording: the caller then shows the server text, so a reworded or new message is never hidden.
 */
export function problemKey(code: string, detail: string): ErrorKey | null {
  if (!Object.hasOwn(errors, code)) return null
  const entry: string | Record<string, string> = errors[code as keyof Catalog]
  if (typeof entry === 'string') return entry === detail ? (code as ErrorKey) : null
  const variant = Object.keys(entry).find((key) => entry[key] === detail)
  return variant ? (`${code}.${variant}` as ErrorKey) : null
}
