import { editorHasBlockWithType, type BlockNoteEditor } from '@blocknote/core'
import { CALLOUT_DEFAULT_BACKGROUND } from '@orbit/editor/schema'
import { i18n } from '@/i18n'

/** One row in the block handle's "Turn into" menu. */
export interface TurnIntoChoice {
  name: string
  type: string
  /** Props written onto the block. Omitted props keep the schema default. */
  props?: Record<string, boolean | number | string>
  /**
   * Props that mark this row as the block's current type. Defaults to `props`.
   * An empty object matches every block of `type` (a callout of any color).
   */
  match?: Record<string, boolean | number | string>
}

interface ChoiceSpec {
  /** Catalog key of the row's name (docs namespace). */
  name: TurnIntoKey
  type: string
  props?: Record<string, boolean | number | string>
  match?: Record<string, boolean | number | string>
}

/** Same order as the block handle in the docs reference: text, headings, lists, code, quote, callout, toggle headings. */
type TurnIntoKey = `turnInto.${'text' | `heading${1 | 2 | 3 | 4 | 5 | 6}` | 'bulletedList' | 'numberedList' | 'todoList' | 'toggleList' | 'code' | 'quote' | 'callout' | `toggleHeading${1 | 2 | 3 | 4}`}`

const CHOICE_SPECS: readonly ChoiceSpec[] = [
  { name: 'turnInto.text', type: 'paragraph' },
  { name: 'turnInto.heading1', type: 'heading', props: { level: 1, isToggleable: false } },
  { name: 'turnInto.heading2', type: 'heading', props: { level: 2, isToggleable: false } },
  { name: 'turnInto.heading3', type: 'heading', props: { level: 3, isToggleable: false } },
  { name: 'turnInto.heading4', type: 'heading', props: { level: 4, isToggleable: false } },
  { name: 'turnInto.heading5', type: 'heading', props: { level: 5, isToggleable: false } },
  { name: 'turnInto.heading6', type: 'heading', props: { level: 6, isToggleable: false } },
  { name: 'turnInto.bulletedList', type: 'bulletListItem' },
  { name: 'turnInto.numberedList', type: 'numberedListItem' },
  { name: 'turnInto.todoList', type: 'checkListItem' },
  { name: 'turnInto.toggleList', type: 'toggleListItem' },
  { name: 'turnInto.code', type: 'codeBlock' },
  { name: 'turnInto.quote', type: 'quote' },
  // A paragraph's `backgroundColor: "default"` would win over the callout default if we did not set this.
  { name: 'turnInto.callout', type: 'callout', props: { backgroundColor: CALLOUT_DEFAULT_BACKGROUND }, match: {} },
  { name: 'turnInto.toggleHeading1', type: 'heading', props: { level: 1, isToggleable: true } },
  { name: 'turnInto.toggleHeading2', type: 'heading', props: { level: 2, isToggleable: true } },
  { name: 'turnInto.toggleHeading3', type: 'heading', props: { level: 3, isToggleable: true } },
  { name: 'turnInto.toggleHeading4', type: 'heading', props: { level: 4, isToggleable: true } },
]

export interface TurnBlock {
  id: string
  type: string
  props: Record<string, unknown>
}

function propTypes(props: ChoiceSpec['props']) {
  if (!props) return undefined
  return Object.fromEntries(Object.entries(props).map(([key, value]) => [key, typeof value])) as Record<string, 'string' | 'number' | 'boolean'>
}

/** Rows the editor's schema can store. An image, a file, a table, or a page has none. */
export function turnIntoChoices(editor: BlockNoteEditor<any, any, any>): TurnIntoChoice[] {
  return CHOICE_SPECS.filter((spec) => editorHasBlockWithType(editor, spec.type, propTypes(spec.props))).map(({ name, type, props, match }) => ({
    name: i18n.t(`docs:${name}`),
    type,
    props,
    match,
  }))
}

export function choiceMatches(block: TurnBlock, choice: TurnIntoChoice): boolean {
  if (block.type !== choice.type) return false
  const match = choice.match ?? choice.props ?? {}
  return Object.entries(match).every(([key, value]) => block.props[key] === value)
}

/** True when the handle should offer "Turn into" for this block. */
export function canTurnBlock(editor: BlockNoteEditor<any, any, any>, block: TurnBlock): boolean {
  return turnIntoChoices(editor).some((choice) => choiceMatches(block, choice))
}

/**
 * Turns `block` into `choice`. A multi-block selection that contains `block` changes every selected block that can
 * turn. A selected image or page stays as it is. The current type is left unchanged, so a colored callout keeps its color.
 */
export function applyTurnInto(editor: BlockNoteEditor<any, any, any>, block: TurnBlock, choice: TurnIntoChoice): void {
  const choices = turnIntoChoices(editor)
  const selected = editor.getSelection()?.blocks as TurnBlock[] | undefined
  const targets = selected && selected.some((item) => item.id === block.id) ? selected : [block]
  editor.transact(() => {
    for (const target of targets) {
      if (!choices.some((item) => choiceMatches(target, item))) continue
      if (choiceMatches(target, choice)) continue
      editor.updateBlock(target.id, { type: choice.type as never, props: choice.props as never })
    }
  })
}

/** What a `page` block linking to a database and a `database` block turn into: each other (spec 3.5 "Turn into"). */
export function databaseTurn(block: TurnBlock, isDatabase: (pageId: string) => boolean): { label: string; type: 'page' | 'database'; props: Record<string, string> } | null {
  if (block.type === 'page' && typeof block.props.pageId === 'string' && isDatabase(block.props.pageId)) {
    return { label: i18n.t('docs:turnInto.inlineDatabase'), type: 'database', props: { databaseId: block.props.pageId, linkId: '' } }
  }
  if (block.type === 'database' && typeof block.props.databaseId === 'string' && block.props.databaseId) {
    return { label: i18n.t('docs:turnInto.pageLink'), type: 'page', props: { pageId: block.props.databaseId } }
  }
  return null
}
