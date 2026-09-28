import { describe, expect, it } from 'vitest'
import { buildPageContent, type RawLine } from './page-builder'
import { parseTag } from './tags'

const EMPTY = { scene: null, music: null }
const line = (text: string, ...tags: string[]): RawLine => ({ text, tags })

describe('parseTag', () => {
  it('parses bare keys case-insensitively', () => {
    expect(parseTag(' Heading ')).toEqual({ key: 'heading', value: '', args: [] })
  })

  it('splits key and value on the first colon only', () => {
    expect(parseTag('hint: Llamar: ya')).toEqual({ key: 'hint', value: 'Llamar: ya', args: ['Llamar:', 'ya'] })
  })
})

describe('buildPageContent', () => {
  it('renders untagged lines as paragraphs and skips empty ones', () => {
    const { content } = buildPageContent([line('Hola\n'), line('   ')], EMPTY)
    expect(content.blocks).toEqual([{ kind: 'paragraph', text: 'Hola' }])
  })

  it('renders headings at two levels', () => {
    const { content } = buildPageContent([line('A', 'heading'), line('B', 'subheading')], EMPTY)
    expect(content.blocks).toEqual([
      { kind: 'heading', level: 2, text: 'A' },
      { kind: 'heading', level: 3, text: 'B' },
    ])
  })

  it('groups consecutive lines that share a block style', () => {
    const { content } = buildPageContent(
      [line('1', 'block: list'), line('2', 'block: list'), line('x'), line('3', 'block: list')],
      EMPTY,
    )
    expect(content.blocks).toEqual([
      { kind: 'group', style: 'list', items: ['1', '2'] },
      { kind: 'paragraph', text: 'x' },
      { kind: 'group', style: 'list', items: ['3'] },
    ])
  })

  it('puts all images of one line, with captions, into one figure after the text', () => {
    const { content } = buildPageContent(
      [line('Galería', 'subheading', 'image: ojo', 'caption: María', 'image: pie')],
      EMPTY,
    )
    expect(content.blocks).toEqual([
      { kind: 'heading', level: 3, text: 'Galería' },
      { kind: 'figure', images: [{ key: 'ojo', caption: 'María' }, { key: 'pie', caption: null }] },
    ])
  })

  it('moves hint lines out of the flow, keeping order', () => {
    const { content } = buildPageContent([line('Cuerpo 1', 'hint: Llamar'), line('Cuerpo 2', 'hint')], EMPTY)
    expect(content.blocks).toEqual([])
    expect(content.hints).toEqual([
      { summary: 'Llamar', body: 'Cuerpo 1' },
      { summary: 'Pista', body: 'Cuerpo 2' },
    ])
  })

  it('turns an input line into the page input request', () => {
    const { content } = buildPageContent([line('Contraseña:', 'input: respuesta password')], EMPTY)
    expect(content.input).toEqual({ variable: 'respuesta', kind: 'password', label: 'Contraseña:', length: null })
    expect(content.blocks).toEqual([])
  })

  it.each([
    ['input: code keypad', 4, 0],
    ['input: code keypad 6', 6, 0],
    ['input: code keypad 0', 4, 1],
    ['input: code keypad many', 4, 1],
  ])('parses "%s" as a keypad of length %i', (tag, length, warningCount) => {
    const { content, warnings } = buildPageContent([line('Código:', tag)], EMPTY)
    expect(content.input).toEqual({ variable: 'code', kind: 'keypad', label: 'Código:', length })
    expect(warnings).toHaveLength(warningCount)
  })

  it('defaults unknown input kinds to text with a warning', () => {
    const { content, warnings } = buildPageContent([line('?', 'input: v magic')], EMPTY)
    expect(content.input?.kind).toBe('text')
    expect(warnings).toHaveLength(1)
  })

  it('rejects an input tag without a valid variable', () => {
    const { content, warnings } = buildPageContent([line('?', 'input: <script>')], EMPTY)
    expect(content.input).toBeNull()
    expect(warnings[0]).toContain('variable')
  })

  it('keeps only the first input of a page', () => {
    const { content, warnings } = buildPageContent([line('a', 'input: a'), line('b', 'input: b')], EMPTY)
    expect(content.input?.variable).toBe('a')
    expect(warnings).toHaveLength(1)
  })

  it('updates persistent presentation and collects one-shot effects', () => {
    const { content, presentation } = buildPageContent(
      [line('x', 'scene: header', 'music: tension', 'sfx: door', 'outcome: fail', 'ending: victoria')],
      { scene: 'old', music: 'old' },
    )
    expect(presentation).toEqual({ scene: 'header', music: 'tension' })
    expect(content).toMatchObject({ sfx: ['door'], outcome: 'fail', ending: 'victoria' })
  })

  it('clears scene and music with their reserved words', () => {
    const { presentation } = buildPageContent([line('x', 'scene: none', 'music: stop')], {
      scene: 'a',
      music: 'b',
    })
    expect(presentation).toEqual({ scene: null, music: null })
  })

  it('does not mutate the previous presentation', () => {
    const previous = Object.freeze({ scene: 'a', music: null })
    buildPageContent([line('x', 'scene: b')], previous)
    expect(previous.scene).toBe('a')
  })

  it('warns about unknown tags, block styles, invalid keys and orphan captions', () => {
    const { warnings } = buildPageContent(
      [line('x', 'wat', 'block: fancy', 'image: ../etc', 'caption: nada', 'music: a b', 'sfx: !')],
      EMPTY,
    )
    expect(warnings).toHaveLength(6)
  })
})
