import { en, fr, type Dictionary } from '@blocknote/core/locales'
import { i18n, type Language } from '@/i18n'

const BLOCKNOTE_DICTIONARIES: Record<Language, Dictionary> = { en, fr }

/** BlockNote's own strings (slash menu, toolbars, file panel, comment menus) in the UI language. */
export function blockNoteDictionary(): Dictionary {
  return BLOCKNOTE_DICTIONARIES[i18n.resolvedLanguage as Language] ?? en
}

/** Placeholders of Orbit's comment fields (BlockNote reads them from the page editor's dictionary). */
export function commentPlaceholders() {
  return {
    new_comment: i18n.t('docs:comments.placeholderNew'),
    comment_reply: i18n.t('docs:comments.placeholderReply'),
    edit_comment: i18n.t('docs:comments.placeholderEdit'),
  }
}

/** The dictionary of a comment editor that shows `placeholder` while empty. */
export function commentEditorDictionary(placeholder: string) {
  const dictionary = blockNoteDictionary()
  return { ...dictionary, placeholders: { ...dictionary.placeholders, emptyDocument: placeholder } }
}
