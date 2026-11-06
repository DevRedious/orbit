import 'i18next'
import type { defaultNS, resources } from '@orbit/i18n/resources'

// Keys are checked by tsc against the English catalogs: a typo or a missing key fails the build.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: (typeof resources)['en']
    returnNull: false
  }
}
