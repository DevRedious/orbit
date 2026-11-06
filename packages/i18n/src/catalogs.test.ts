import { expect, test } from 'bun:test'
import { LANGUAGES } from './languages'
import { resources } from './resources'

type Tree = { [key: string]: string | Tree }

/** `path → string` for every leaf of a catalog tree. */
function leaves(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out.set(path, value)
    else for (const [leaf, text] of leaves(value, path)) out.set(leaf, text)
  }
  return out
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map((match) => match[1]).sort()

const source = leaves(resources.en as unknown as Tree)

for (const language of LANGUAGES.filter((language) => language !== 'en')) {
  const catalog = leaves(resources[language] as unknown as Tree)

  test(`${language} has exactly the English keys`, () => {
    expect([...catalog.keys()].sort()).toEqual([...source.keys()].sort())
  })

  test(`${language} keeps every interpolation of the English text`, () => {
    const mismatches = [...source].filter(([key, text]) => {
      const translated = catalog.get(key)
      return translated !== undefined && placeholders(translated).join() !== placeholders(text).join()
    })
    expect(mismatches.map(([key]) => key)).toEqual([])
  })

  test(`${language} has no empty string`, () => {
    expect([...catalog].filter(([, text]) => !text.trim()).map(([key]) => key)).toEqual([])
  })
}
