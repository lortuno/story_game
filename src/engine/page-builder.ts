/**
 * Turns what Yarn delivered for one page (lines with #tags, and <<commands>>) into renderable
 * blocks. Pure function: no Yarn runtime, no DOM. Reference: specs/story-engine.md.
 */
import type { ParsedCommand } from './commands'
import { withPrefix } from './markup'
import { IDENTIFIER, parseTag, type ParsedTag } from './tags'
import type { Block, GroupStyle, Hint, ImageRef, InputKind, InputRequest, Presentation, StyledText } from './types'

export type StoryItem =
  | {
      readonly kind: 'line'
      readonly text: StyledText
      readonly speaker: string | null
      /** Author #tags (Yarn's internal `line:` ids already removed). */
      readonly tags: readonly string[]
    }
  | ({ readonly kind: 'command' } & ParsedCommand)

export interface PageContent {
  readonly blocks: readonly Block[]
  readonly hints: readonly Hint[]
  readonly input: InputRequest | null
  readonly outcome: string | null
  readonly ending: string | null
  readonly sfx: readonly string[]
}

export interface BuildResult {
  readonly content: PageContent
  readonly presentation: Presentation
  readonly warnings: readonly string[]
}

const GROUP_STYLES: ReadonlySet<string> = new Set<GroupStyle>(['postit', 'list', 'olist', 'note', 'clue'])
const INPUT_KINDS: ReadonlySet<string> = new Set<InputKind>(['text', 'password', 'code', 'keypad'])
const LINE_TAG_KEYS: ReadonlySet<string> = new Set(['heading', 'subheading', 'block', 'input', 'kind', 'length', 'outcome', 'ending'])
const DEFAULT_KEYPAD_LENGTH = 4
const MAX_KEYPAD_LENGTH = 12
const DEFAULT_HINT_SUMMARY = 'Pista'

/** Where a line's text goes, decided by its tags (and a preceding <<hint>>). */
type LineRole =
  | { readonly kind: 'paragraph' }
  | { readonly kind: 'heading'; readonly level: 2 | 3 }
  | { readonly kind: 'group'; readonly style: GroupStyle }
  | { readonly kind: 'hint'; readonly summary: string }
  | { readonly kind: 'input'; readonly variable: string; readonly inputKind: InputKind; readonly length: number | null }

interface BuildState {
  readonly blocks: Block[]
  readonly hints: Hint[]
  readonly sfx: string[]
  readonly warnings: string[]
  presentation: Presentation
  input: InputRequest | null
  outcome: string | null
  ending: string | null
  /** Summary from a <<hint>> command, waiting for the line that holds the hint text. */
  pendingHint: string | null
  /** Consecutive <<image>> commands share one figure (a gallery). */
  previousWasImage: boolean
}

export function buildPageContent(items: readonly StoryItem[], previous: Presentation): BuildResult {
  const state: BuildState = {
    blocks: [],
    hints: [],
    sfx: [],
    warnings: [],
    presentation: previous,
    input: null,
    outcome: null,
    ending: null,
    pendingHint: null,
    previousWasImage: false,
  }

  for (const item of items) {
    if (item.kind === 'command') applyCommand(state, item)
    else applyLine(state, item)
  }
  if (state.pendingHint !== null) state.warnings.push(`<<hint "${state.pendingHint}">> is not followed by a line`)

  const { blocks, hints, input, outcome, ending, sfx, presentation, warnings } = state
  return { content: { blocks, hints, input, outcome, ending, sfx }, presentation, warnings }
}

// ---- commands ----

function applyCommand(state: BuildState, command: ParsedCommand): void {
  const [first, second] = command.args
  const wasImage = state.previousWasImage
  state.previousWasImage = false

  switch (command.name) {
    case 'scene':
      state.presentation = { ...state.presentation, scene: identifierOrNull(command, 'none', state.warnings) }
      return
    case 'music':
      state.presentation = { ...state.presentation, music: identifierOrNull(command, 'stop', state.warnings) }
      return
    case 'sfx':
      if (first && IDENTIFIER.test(first)) state.sfx.push(first)
      else state.warnings.push(`<<sfx>> needs a sound name, got "${first ?? ''}"`)
      return
    case 'image':
      addImage(state, first, second ?? null, wasImage)
      return
    case 'hint':
      if (state.pendingHint !== null) state.warnings.push(`<<hint "${state.pendingHint}">> is not followed by a line`)
      state.pendingHint = first?.trim() || DEFAULT_HINT_SUMMARY
      return
    default:
      state.warnings.push(`Unknown command <<${command.name}>>`)
  }
}

function addImage(state: BuildState, key: string | undefined, caption: string | null, joinPrevious: boolean): void {
  if (!key || !IDENTIFIER.test(key)) {
    state.warnings.push(`<<image>> needs an image key, got "${key ?? ''}"`)
    return
  }
  const image: ImageRef = { key, caption: caption?.trim() || null }
  const last = state.blocks.at(-1)
  if (joinPrevious && last?.kind === 'figure') {
    state.blocks[state.blocks.length - 1] = { ...last, images: [...last.images, image] }
  } else {
    state.blocks.push({ kind: 'figure', images: [image] })
  }
  state.previousWasImage = true
}

function identifierOrNull(command: ParsedCommand, clearWord: string, warnings: string[]): string | null {
  const value = command.args[0]
  if (!value || value === clearWord) return null
  if (IDENTIFIER.test(value)) return value
  warnings.push(`Invalid <<${command.name}>> value "${value}"`)
  return null
}

// ---- lines ----

function applyLine(state: BuildState, line: Extract<StoryItem, { kind: 'line' }>): void {
  state.previousWasImage = false
  const tags = line.tags.map(parseTag)
  for (const tag of tags) {
    if (tag.key === 'outcome') state.outcome = tag.value || null
    else if (tag.key === 'ending') state.ending = tag.value || 'end'
    else if (!LINE_TAG_KEYS.has(tag.key)) state.warnings.push(`Unknown tag "#${tag.key}"`)
  }

  const role = readRole(tags, state)
  const text = line.speaker && role.kind !== 'paragraph' ? withPrefix(line.text, `${line.speaker}: `) : line.text

  if (role.kind === 'hint') {
    state.hints.push({ summary: role.summary, body: text })
  } else if (role.kind === 'input') {
    if (state.input) state.warnings.push(`Only one #input per page; ignoring input for "${role.variable}"`)
    else state.input = { variable: role.variable, kind: role.inputKind, label: text, length: role.length }
  } else if (text.text.trim()) {
    appendText(state.blocks, role, text, line.speaker)
  }
}

function readRole(tags: readonly ParsedTag[], state: BuildState): LineRole {
  if (state.pendingHint !== null) {
    const summary = state.pendingHint
    state.pendingHint = null
    return { kind: 'hint', summary }
  }
  const byKey = new Map(tags.map((tag) => [tag.key, tag]))
  const input = byKey.get('input')
  if (input) return parseInputRole(input, byKey.get('kind'), byKey.get('length'), state.warnings) ?? { kind: 'paragraph' }
  if (byKey.has('heading')) return { kind: 'heading', level: 2 }
  if (byKey.has('subheading')) return { kind: 'heading', level: 3 }

  const block = byKey.get('block')
  if (block) {
    if (GROUP_STYLES.has(block.value)) return { kind: 'group', style: block.value as GroupStyle }
    state.warnings.push(`Unknown block style "${block.value}"`)
  }
  return { kind: 'paragraph' }
}

/** `#input:variable [#kind:text|password|code|keypad] [#length:n]` — length only applies to keypads. */
function parseInputRole(
  input: ParsedTag,
  kindTag: ParsedTag | undefined,
  lengthTag: ParsedTag | undefined,
  warnings: string[],
): LineRole | null {
  const variable = input.value.replace(/^\$/, '')
  if (!IDENTIFIER.test(variable)) {
    warnings.push(`#input needs a variable name, got "${input.value}"`)
    return null
  }
  const kind = kindTag?.value || 'text'
  if (!INPUT_KINDS.has(kind)) {
    warnings.push(`Unknown input kind "${kind}", using "text"`)
    return { kind: 'input', variable, inputKind: 'text', length: null }
  }
  if (kind !== 'keypad') return { kind: 'input', variable, inputKind: kind as InputKind, length: null }

  const length = lengthTag === undefined ? DEFAULT_KEYPAD_LENGTH : Number(lengthTag.value)
  if (!Number.isInteger(length) || length < 1 || length > MAX_KEYPAD_LENGTH) {
    warnings.push(`Keypad length must be 1-${MAX_KEYPAD_LENGTH}, got "${lengthTag?.value}"; using ${DEFAULT_KEYPAD_LENGTH}`)
    return { kind: 'input', variable, inputKind: 'keypad', length: DEFAULT_KEYPAD_LENGTH }
  }
  return { kind: 'input', variable, inputKind: 'keypad', length }
}

function appendText(blocks: Block[], role: LineRole, text: StyledText, speaker: string | null): void {
  if (role.kind === 'heading') {
    blocks.push({ kind: 'heading', level: role.level, text })
    return
  }
  if (role.kind !== 'group') {
    blocks.push({ kind: 'paragraph', text, speaker })
    return
  }
  // Consecutive lines with the same block style form one group.
  const last = blocks.at(-1)
  if (last?.kind === 'group' && last.style === role.style) {
    blocks[blocks.length - 1] = { ...last, items: [...last.items, text] }
  } else {
    blocks.push({ kind: 'group', style: role.style, items: [text] })
  }
}
