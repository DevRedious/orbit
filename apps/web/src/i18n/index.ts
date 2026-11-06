import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES, matchLanguage, type Language } from '@orbit/i18n/languages'
import { defaultNS, namespaces, resources } from '@orbit/i18n/resources'

export { LANGUAGE_LABELS, LANGUAGES, type Language } from '@orbit/i18n/languages'

const STORAGE_KEY = 'orbit.language'

function storedLanguage(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLanguage(value) ? value : null
  } catch {
    return null
  }
}

/** The choice made in Profile → Appearance, then the browser's preferred languages, then English. */
export function detectLanguage(): Language {
  return storedLanguage() ?? matchLanguage(navigator.languages ?? [navigator.language]) ?? DEFAULT_LANGUAGE
}

/** Switches the UI and remembers the choice in this browser, like the appearance settings. */
export function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // storage blocked: the choice lasts until the tab closes
  }
  void i18next.changeLanguage(language)
}

// Catalogs are bundled, so initialise synchronously: the first render already has its strings.
void i18next.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  defaultNS,
  ns: namespaces,
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
})

const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = language
}
i18next.on('languageChanged', syncDocumentLanguage)
syncDocumentLanguage(i18next.language)

export const i18n = i18next
