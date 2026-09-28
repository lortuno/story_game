import { describe, expect, it } from 'vitest'
import { plainText } from './markup'
import { buildPageContent, type StoryItem } from './page-builder'
import { parseTag } from './tags'

const EMPTY = { scene: null, music: null }
const line = (text: string, ...tags: string[]): StoryItem => ({ kind: 'line', text: plainText(text), speaker: null, tags })
const command = (name: string, ...args: string[]): StoryItem => ({ kind: 'command', name, args })

describe('parseTag', () => {
  it('parses bare keys case-insensitively', () => {
    expect(parseTag(' Heading ')).toEqual({ key: 'heading', value: '', args: [] })
  })

  it('splits key and value on the first colon only', () => {
    expect(parseTag('input:respuesta')).toEqual({ key: 'input', value: 'respuesta', args: ['respuesta'] })
  })
})

describe('buildPageContent', () => {
  it('renders untagged lines as paragraphs and skips empty ones', () => {
    const { content } = buildPageContent([line('Hola'), line('   ')], EMPTY)
    expect(content.blocks).toEqual([{ kind: 'paragraph', text: plainText('Hola'), speaker: null }])
  })

  it('keeps the Yarn speaker on paragraphs and prefixes it elsewhere', () => {
    const { content } = buildPageContent(
      [
        { kind: 'line', text: plainText('hola'), speaker: 'Tina', tags: [] },
        { kind: 'line', text: plainText('nota'), speaker: 'Tina', tags: ['subheading'] },
      ],
      EMPTY,
    )
    expect(content.blocks).toEqual([
      { kind: 'paragraph', text: plainText('hola'), speaker: 'Tina' },
      { kind: 'heading', level: 3, text: plainText('Tina: nota') },
    ])
  })

  it('groups consecutive lines that share a block style', () => {
    const { content } = buildPageContent(
      [line('1', 'block:list'), line('2', 'block:list'), line('x'), line('3', 'block:list')],
      EMPTY,
    )
    expect(content.blocks.map((block) => block.kind)).toEqual(['group', 'paragraph', 'group'])
    expect(content.blocks[0]).toMatchObject({ style: 'list', items: [plainText('1'), plainText('2')] })
  })

  it('joins consecutive <<image>> commands into one gallery', () => {
    const { content } = buildPageContent(
      [command('image', 'ojo', 'María'), command('image', 'pie'), line('x'), command('image', 'solo')],
      EMPTY,
    )
    expect(content.blocks).toEqual([
      { kind: 'figure', images: [{ key: 'ojo', caption: 'María' }, { key: 'pie', caption: null }] },
      { kind: 'paragraph', text: plainText('x'), speaker: null },
      { kind: 'figure', images: [{ key: 'solo', caption: null }] },
    ])
  })

  it('turns the line after <<hint>> into a hint, keeping order', () => {
    const { content, warnings } = buildPageContent(
      [command('hint', 'Llamar'), line('Cuerpo 1'), command('hint'), line('Cuerpo 2'), line('Texto')],
      EMPTY,
    )
    expect(content.hints).toEqual([
      { summary: 'Llamar', body: plainText('Cuerpo 1') },
      { summary: 'Pista', body: plainText('Cuerpo 2') },
    ])
    expect(content.blocks).toHaveLength(1)
    expect(warnings).toEqual([])
  })

  it('warns about a <<hint>> with no line after it', () => {
    const { warnings } = buildPageContent([command('hint', 'a'), command('hint', 'b'), line('x')], EMPTY)
    expect(warnings).toHaveLength(1)
    expect(buildPageContent([command('hint', 'a')], EMPTY).warnings).toHaveLength(1)
  })

  it('turns an #input line into the page input request', () => {
    const { content } = buildPageContent([line('Contraseña:', 'input:$respuesta', 'kind:password')], EMPTY)
    expect(content.input).toEqual({ variable: 'respuesta', kind: 'password', label: plainText('Contraseña:'), length: null })
    expect(content.blocks).toEqual([])
  })

  it.each([
    [['kind:keypad'], 4, 0],
    [['kind:keypad', 'length:6'], 6, 0],
    [['kind:keypad', 'length:0'], 4, 1],
    [['kind:keypad', 'length:many'], 4, 1],
  ])('parses keypad tags %j as length %i', (tags, length, warningCount) => {
    const { content, warnings } = buildPageContent([line('Código:', 'input:code', ...tags)], EMPTY)
    expect(content.input).toMatchObject({ variable: 'code', kind: 'keypad', length })
    expect(warnings).toHaveLength(warningCount)
  })

  it('defaults unknown input kinds to text with a warning', () => {
    const { content, warnings } = buildPageContent([line('?', 'input:v', 'kind:magic')], EMPTY)
    expect(content.input?.kind).toBe('text')
    expect(warnings).toHaveLength(1)
  })

  it('rejects an #input without a valid variable', () => {
    const { content, warnings } = buildPageContent([line('?', 'input:<script>')], EMPTY)
    expect(content.input).toBeNull()
    expect(warnings[0]).toContain('variable')
  })

  it('keeps only the first input of a page', () => {
    const { content, warnings } = buildPageContent([line('a', 'input:a'), line('b', 'input:b')], EMPTY)
    expect(content.input?.variable).toBe('a')
    expect(warnings).toHaveLength(1)
  })

  it('updates persistent presentation and collects one-shot effects', () => {
    const { content, presentation } = buildPageContent(
      [command('scene', 'header'), command('music', 'tension'), command('sfx', 'door'), line('x', 'outcome:fail', 'ending:victoria')],
      { scene: 'old', music: 'old' },
    )
    expect(presentation).toEqual({ scene: 'header', music: 'tension' })
    expect(content).toMatchObject({ sfx: ['door'], outcome: 'fail', ending: 'victoria' })
  })

  it('clears scene and music with their reserved words', () => {
    const { presentation } = buildPageContent([command('scene', 'none'), command('music', 'stop')], { scene: 'a', music: 'b' })
    expect(presentation).toEqual({ scene: null, music: null })
  })

  it('does not mutate the previous presentation', () => {
    const previous = Object.freeze({ scene: 'a', music: null })
    buildPageContent([command('scene', 'b')], previous)
    expect(previous.scene).toBe('a')
  })

  it('warns about unknown tags, commands, block styles and invalid keys', () => {
    const { warnings } = buildPageContent(
      [line('x', 'wat', 'block:fancy'), command('dance'), command('image', '../etc'), command('music', 'a b'), command('sfx', '!')],
      EMPTY,
    )
    expect(warnings).toHaveLength(6)
  })
})
