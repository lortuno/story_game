import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileInkFile } from './compile.ts'

function storyWith(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ink-'))
  writeFileSync(join(dir, 'chapter.ink'), 'Chapter text.\n')
  writeFileSync(join(dir, 'main.ink'), source)
  return join(dir, 'main.ink')
}

// Another drive on Windows (relative() can't express it with ".."), a system file elsewhere.
const FOREIGN_ABSOLUTE = process.platform === 'win32' ? 'Z:\\secrets\\x.ink' : '/etc/passwd'

describe('compileInkFile', () => {
  it('compiles INCLUDEs inside the story folder and hashes the result', () => {
    const result = compileInkFile(storyWith('INCLUDE chapter.ink\nHello.\n'))
    expect(result.errors).toEqual([])
    expect(result.json).toContain('Hello.')
    expect(result.hash).toMatch(/^[0-9a-f]{12}$/)
    expect(result.files).toHaveLength(2)
  })

  it.each(['../outside.ink', join(tmpdir(), 'outside.ink'), FOREIGN_ABSOLUTE])(
    'rejects INCLUDE %s outside the story folder',
    (path) => {
      const result = compileInkFile(storyWith(`INCLUDE ${path}\nHello.\n`))
      expect(result.json).toBeNull()
      expect(result.errors.join(' ')).toContain('outside story folder')
    },
  )

  it('reports ink syntax errors', () => {
    const result = compileInkFile(storyWith('-> nowhere\n'))
    expect(result.json).toBeNull()
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
