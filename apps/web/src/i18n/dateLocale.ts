import { enUS, fr, type DayPickerLocale } from 'react-day-picker/locale'
import { DEFAULT_LANGUAGE, matchLanguage, type Language } from '@orbit/i18n/languages'

/** The calendar of each UI language: month and day names, the day picker's own labels, and the first day of the week. */
const CALENDAR_LOCALES: Record<Language, DayPickerLocale> = { en: enUS, fr }

/** The calendar locale of a UI language (a region tag such as `en-GB` uses its base language). */
export function calendarLocale(language: string): DayPickerLocale {
  return CALENDAR_LOCALES[matchLanguage([language]) ?? DEFAULT_LANGUAGE]
}
