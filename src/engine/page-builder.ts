/**
 * Turns the raw lines ink produced for one page (text + tags) into renderable blocks.
 * Pure function: no ink, no DOM. Tag reference: specs/story-engine.md.
 */
import { IDENTIFIER, parseTag, type ParsedTag } from './tags'
import type { Block, GroupStyle, Hint, ImageRef, InputKind, InputRequest, Presentation } from './types'

export interface RawLine {
  readonly text: string
  readonly tags: readonly string[]
}

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
const INPUT_KINDS: ReadonlySet<string> = new Set<InputKind>(['text', 'password', 'code'])
const DEFAULT_HINT_SUMMARY = 'Pista'

/** Where a line's text goes, decided by its tags. */
type LineRole =
  | { readonly kind: 'paragraph' }
  | { readonly kind: 'heading'; readonly level: 2 | 3 }
  | { readonly kind: 'group'; readonly style: GroupStyle }
  | { readonly kind: 'hint'; readonly summary: string }
  | { readonly kind: 'input'; readonly variable: string; readonly inputKind: InputKind }

interface LineDirectives {
  readonly role: LineRole
  readonly images: readonly ImageRef[]
}

export function buildPageContent(lines: readonly RawLine[], previous: Presentation): BuildResult {
  const warnings: string[] = []
  const blocks: Block[] = []
  const hints: Hint[] = []
  const sfx: string[] = []
  let presentation = previous
  let input: InputRequest | null = null
  let outcome: string | null = null
  let ending: string | null = null

  for (const line of lines) {
    const text = line.text.trim()
    const tags = line.tags.map(parseTag)

    // Tags with page-level effects.
    for (const tag of tags) {
      if (tag.key === 'scene') presentation = { ...presentation, scene: identifierOrNull(tag, 'none', warnings) }
      else if (tag.key === 'music') presentation = { ...presentation, music: identifierOrNull(tag, 'stop', warnings) }
      else if (tag.key === 'sfx') pushIdentifier(sfx, tag, warnings)
      else if (tag.key === 'outcome') outcome = tag.value || null
      else if (tag.key === 'ending') ending = tag.value || 'end'
    }

    const { role, images } = readLineDirectives(tags, warnings)
    if (role.kind === 'hint') {
      hints.push({ summary: role.summary, body: text })
    } else if (role.kind === 'input') {
      if (input) warnings.push(`Only one # input per page; ignoring input for "${role.variable}"`)
      else input = { variable: role.variable, kind: role.inputKind, label: text }
    } else if (text) {
      appendText(blocks, role, text)
    }
    if (images.length > 0) blocks.push({ kind: 'figure', images })
  }

  return { content: { blocks, hints, input, outcome, ending, sfx }, presentation, warnings }
}

function readLineDirectives(tags: readonly ParsedTag[], warnings: string[]): LineDirectives {
  let role: LineRole = { kind: 'paragraph' }
  const images: ImageRef[] = []

  for (const tag of tags) {
    switch (tag.key) {
      case 'heading':
        role = { kind: 'heading', level: 2 }
        break
      case 'subheading':
        role = { kind: 'heading', level: 3 }
        break
      case 'block':
        if (GROUP_STYLES.has(tag.value)) role = { kind: 'group', style: tag.value as GroupStyle }
        else warnings.push(`Unknown block style "${tag.value}"`)
        break
      case 'hint':
        role = { kind: 'hint', summary: tag.value || DEFAULT_HINT_SUMMARY }
        break
      case 'input':
        role = parseInputRole(tag, warnings) ?? role
        break
      case 'image':
        if (IDENTIFIER.test(tag.value)) images.push({ key: tag.value, caption: null })
        else warnings.push(`Invalid image key "${tag.value}"`)
        break
      case 'caption': {
        // A caption belongs to the image tag right before it.
        const last = images.at(-1)
        if (last) images[images.length - 1] = { ...last, caption: tag.value || null }
        else warnings.push('# caption must follow an # image tag')
        break
      }
      default:
        if (!PAGE_LEVEL_KEYS.has(tag.key)) warnings.push(`Unknown tag "${tag.key}"`)
    }
  }
  return { role, images }
}

const PAGE_LEVEL_KEYS: ReadonlySet<string> = new Set(['scene', 'music', 'sfx', 'outcome', 'ending'])

function parseInputRole(tag: ParsedTag, warnings: string[]): LineRole | null {
  const [variable, kind = 'text'] = tag.args
  if (!variable || !IDENTIFIER.test(variable)) {
    warnings.push(`# input needs a variable name, got "${tag.value}"`)
    return null
  }
  if (!INPUT_KINDS.has(kind)) {
    warnings.push(`Unknown input kind "${kind}", using "text"`)
    return { kind: 'input', variable, inputKind: 'text' }
  }
  return { kind: 'input', variable, inputKind: kind as InputKind }
}

function appendText(blocks: Block[], role: LineRole, text: string): void {
  if (role.kind === 'heading') {
    blocks.push({ kind: 'heading', level: role.level, text })
    return
  }
  if (role.kind !== 'group') {
    blocks.push({ kind: 'paragraph', text })
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

function identifierOrNull(tag: ParsedTag, clearWord: string, warnings: string[]): string | null {
  if (!tag.value || tag.value === clearWord) return null
  if (IDENTIFIER.test(tag.value)) return tag.value
  warnings.push(`Invalid # ${tag.key} value "${tag.value}"`)
  return null
}

function pushIdentifier(target: string[], tag: ParsedTag, warnings: string[]): void {
  if (IDENTIFIER.test(tag.value)) target.push(tag.value)
  else warnings.push(`Invalid # ${tag.key} value "${tag.value}"`)
}
