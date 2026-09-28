import { describe, expect, it } from 'vitest'
import { compileSource } from 'yarnspinner-typescript'
import { findContentFreeLoops, type ProgramLike } from './loops.ts'

function loopsIn(source: string) {
  const { program, diagnostics } = compileSource(source)
  const errors = diagnostics.filter((d) => d.severity === 'error')
  if (!program || errors.length > 0) throw new Error(errors.map((d) => d.message).join('\n'))
  return findContentFreeLoops(program as unknown as ProgramLike)
}

describe('findContentFreeLoops', () => {
  it('flags a node that jumps to itself', () => {
    expect(loopsIn('title: A\n---\n<<jump A>>\n===\n').unconditional).toEqual([['A', 'A']])
  })

  it('flags a mutual jump cycle with only <<set>> in between', () => {
    const report = loopsIn(
      'title: A\n---\n<<declare $x = 0>>\n<<jump B>>\n===\ntitle: B\n---\n<<set $x = 1>>\n<<jump A>>\n===\n',
    )
    expect(report.unconditional).toEqual([['A', 'B', 'A']])
  })

  it('reports a cycle guarded by <<if>> as conditional only', () => {
    const report = loopsIn(
      'title: A\n---\n<<declare $n = 0>>\n<<if $n < 3>>\n<<set $n = $n + 1>>\n<<jump A>>\n<<endif>>\nFin.\n===\n',
    )
    expect(report.unconditional).toEqual([])
    expect(report.conditional).toEqual([['A', 'A']])
  })

  it.each([
    ['a line', 'title: A\n---\nHola.\n<<jump A>>\n===\n'],
    ['a command', 'title: A\n---\n<<wait 1>>\n<<jump A>>\n===\n'],
    ['options', 'title: A\n---\n-> Otra vez\n    <<jump A>>\n===\n'],
  ])('accepts a cycle that yields %s', (_label, source) => {
    expect(loopsIn(source)).toEqual({ unconditional: [], conditional: [] })
  })

  it('follows detours', () => {
    const report = loopsIn('title: A\n---\n<<detour B>>\nHola.\n===\ntitle: B\n---\n<<detour A>>\n===\n')
    expect(report.unconditional).toEqual([['A', 'B', 'A']])
  })
})
