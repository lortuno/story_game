/**
 * Converts Yarn Spinner markup attributes into our `StyledText` marks.
 * Supported: `[b]…[/b]`, `[link key=libros]…[/link]`, `[tip text="…"]…[/tip]`.
 * Other attributes (e.g. Yarn's built-in `character`) are ignored.
 */
import type { Mark, StyledText } from './types'

/** The structural subset of yarnspinner-typescript's markup attribute we rely on. */
export interface YarnMarkupAttribute {
  readonly name: string
  readonly position: number
  readonly length: number
  readonly properties?: Readonly<Record<string, YarnMarkupValue | undefined>>
}

interface YarnMarkupValue {
  readonly type?: string
  readonly stringValue?: string
  readonly integerValue?: number
  readonly floatValue?: number
  readonly boolValue?: boolean
}

const IGNORED_ATTRIBUTES: ReadonlySet<string> = new Set(['character', 'nomarkup', 'trimwhitespace'])
// A `[name …]…[/name]` pair still in the text means Yarn didn't parse it (usually an unescaped ':').
const UNPARSED_MARKUP = /\[([a-z]+)\b[^\]]*\][^[]*\[\/\1\]/i

export function plainText(text: string): StyledText {
  return { text, marks: [] }
}

export function styledFromYarn(
  text: string,
  attributes: readonly YarnMarkupAttribute[] | undefined,
  warn: (message: string) => void,
): StyledText {
  if (UNPARSED_MARKUP.test(text)) {
    warn(`Unparsed markup in "${text}". Escape ':' as '\\:' inside Yarn lines.`)
  }
  const marks: Mark[] = []
  for (const attribute of attributes ?? []) {
    const mark = toMark(attribute, warn)
    if (mark) marks.push(mark)
  }
  return { text, marks }
}

/** Prefixes a line with its Yarn speaker ("Hacker: …"), shifting marks accordingly. */
export function withPrefix(styled: StyledText, prefix: string): StyledText {
  const offset = prefix.length
  return {
    text: prefix + styled.text,
    marks: styled.marks.map((mark) => ({ ...mark, start: mark.start + offset, end: mark.end + offset })),
  }
}

function toMark(attribute: YarnMarkupAttribute, warn: (message: string) => void): Mark | null {
  const start = attribute.position
  const end = attribute.position + attribute.length
  switch (attribute.name) {
    case 'b':
      return { kind: 'bold', start, end }
    case 'link': {
      const key = stringProperty(attribute, 'key')
      if (key) return { kind: 'link', start, end, key }
      warn('[link] needs a key, e.g. [link key=libros]…[/link]')
      return null
    }
    case 'tip': {
      const tip = stringProperty(attribute, 'text')
      if (tip) return { kind: 'tip', start, end, tip }
      warn('[tip] needs text, e.g. [tip text="…"]…[/tip]')
      return null
    }
    default:
      if (!IGNORED_ATTRIBUTES.has(attribute.name)) warn(`Unknown markup [${attribute.name}]`)
      return null
  }
}

function stringProperty(attribute: YarnMarkupAttribute, name: string): string | null {
  const value = attribute.properties?.[name]
  if (!value) return null
  if (value.type === 'string' || value.type === undefined) return value.stringValue?.trim() || null
  if (value.type === 'integer') return String(value.integerValue)
  if (value.type === 'float') return String(value.floatValue)
  if (value.type === 'bool') return String(value.boolValue)
  return null
}
