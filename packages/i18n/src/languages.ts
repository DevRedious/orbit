export const LANGUAGES = ['en'] as const
export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

/** Each language in its own name, as a picker shows it. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/** The first supported language among BCP 47 tags in order of preference (`en-GB` matches `en`). */
export function matchLanguage(tags: readonly string[]): Language | null {
  for (const tag of tags) {
    const base = tag.split('-')[0]?.toLowerCase()
    if (isLanguage(base)) return base
  }
  return null
}
