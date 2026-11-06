import { en } from './locales/en'

/** Every catalog, bundled: the first render already has its strings. English is the source and the fallback. */
export const resources = { en } as const

export const defaultNS = 'common'
export const namespaces = Object.keys(en) as (keyof typeof en)[]
