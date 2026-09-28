import { describe, expect, it } from 'vitest'
import { parseInline, toPlainText } from './markup'

describe('parseInline', () => {
  it('returns a single text token for plain text', () => {
    expect(parseInline('Hola, mundo')).toEqual([{ kind: 'text', text: 'Hola, mundo' }])
  })

  it('returns no tokens for an empty string', () => {
    expect(parseInline('')).toEqual([])
  })

  it('parses bold, links and tooltips in order', () => {
    expect(parseInline('Un **acertijo**, [libros](libros) y [echar](? Multiplicar).')).toEqual([
      { kind: 'text', text: 'Un ' },
      { kind: 'strong', text: 'acertijo' },
      { kind: 'text', text: ', ' },
      { kind: 'link', label: 'libros', key: 'libros' },
      { kind: 'text', text: ' y ' },
      { kind: 'tip', label: 'echar', tip: 'Multiplicar' },
      { kind: 'text', text: '.' },
    ])
  })

  it('keeps HTML as literal text', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { kind: 'text', text: '<img src=x onerror=alert(1)>' },
    ])
  })

  it('leaves unbalanced markup untouched', () => {
    expect(parseInline('**sin cerrar [x](')).toEqual([{ kind: 'text', text: '**sin cerrar [x](' }])
  })
})

describe('toPlainText', () => {
  it('strips markup but keeps visible labels', () => {
    expect(toPlainText('[La receta](?Pista) **ya**')).toBe('La receta ya')
  })
})
