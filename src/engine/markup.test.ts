import { describe, expect, it, vi } from 'vitest'
import { parseCommand } from './commands'
import { plainText, styledFromYarn, withPrefix, type YarnMarkupAttribute } from './markup'

const str = (stringValue: string) => ({ type: 'string', stringValue })

describe('styledFromYarn', () => {
  it('maps b, link and tip attributes to marks', () => {
    const attributes: YarnMarkupAttribute[] = [
      { name: 'b', position: 0, length: 2, properties: {} },
      { name: 'link', position: 3, length: 6, properties: { key: str('libros') } },
      { name: 'tip', position: 10, length: 5, properties: { text: str(' Multiplicar ') } },
    ]
    expect(styledFromYarn('Un libros echar', attributes, vi.fn()).marks).toEqual([
      { kind: 'bold', start: 0, end: 2 },
      { kind: 'link', start: 3, end: 9, key: 'libros' },
      { kind: 'tip', start: 10, end: 15, tip: 'Multiplicar' },
    ])
  })

  it('accepts non-string property values', () => {
    const attributes: YarnMarkupAttribute[] = [
      { name: 'link', position: 0, length: 1, properties: { key: { type: 'integer', integerValue: 7 } } },
      { name: 'tip', position: 0, length: 1, properties: { text: { type: 'bool', boolValue: true } } },
    ]
    expect(styledFromYarn('x', attributes, vi.fn()).marks.map((mark) => ('key' in mark ? mark.key : 'tip' in mark ? mark.tip : ''))).toEqual([
      '7',
      'true',
    ])
  })

  it('ignores Yarn built-ins, warns about unknown or incomplete markup', () => {
    const warn = vi.fn()
    const attributes: YarnMarkupAttribute[] = [
      { name: 'character', position: 0, length: 3 },
      { name: 'wave', position: 0, length: 3 },
      { name: 'link', position: 0, length: 3, properties: {} },
      { name: 'tip', position: 0, length: 3 },
    ]
    expect(styledFromYarn('abc', attributes, warn).marks).toEqual([])
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('warns when markup was left unparsed (unescaped colon)', () => {
    const warn = vi.fn()
    styledFromYarn('Ver [tip text="Pista: x"]receta[/tip]', undefined, warn)
    expect(warn.mock.calls[0][0]).toContain("Escape ':'")
  })
})

describe('withPrefix', () => {
  it('prepends text and shifts marks', () => {
    const styled = withPrefix({ text: 'hola', marks: [{ kind: 'bold', start: 0, end: 4 }] }, 'Tina: ')
    expect(styled).toEqual({ text: 'Tina: hola', marks: [{ kind: 'bold', start: 6, end: 10 }] })
  })
})

describe('plainText', () => {
  it('wraps a string without marks', () => {
    expect(plainText('x')).toEqual({ text: 'x', marks: [] })
  })
})

describe('parseCommand', () => {
  it.each([
    ['scene header_police', { name: 'scene', args: ['header_police'] }],
    ['image tablet "Tablet bloqueada con un pósit"', { name: 'image', args: ['tablet', 'Tablet bloqueada con un pósit'] }],
    ['hint "Dice \\"hola\\": vale"', { name: 'hint', args: ['Dice "hola": vale'] }],
    ['IMAGE  a   ""  ', { name: 'image', args: ['a', ''] }],
    ['', { name: '', args: [] }],
  ])('%s', (command, expected) => {
    expect(parseCommand(command)).toEqual(expected)
  })
})
