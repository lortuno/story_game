import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findContentFreeLoops, type ProgramLike } from './loops.ts'
import { compileYarnProject } from './compile.ts'

function projectWith(files: Record<string, string>, sourceFiles = ['**/*.yarn']): string {
  const dir = mkdtempSync(join(tmpdir(), 'yarn-'))
  for (const [name, source] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    writeFileSync(join(dir, name), source)
  }
  const project = join(dir, 'test.yarnproject')
  writeFileSync(project, JSON.stringify({ projectFileVersion: 4, baseLanguage: 'es', sourceFiles }))
  return project
}

describe('compileYarnProject', () => {
  it('compiles every .yarn file of the project and hashes the program', () => {
    const result = compileYarnProject(
      projectWith({
        'a.yarn': 'title: Start\n---\nHola.\n<<jump B>>\n===\n',
        'chapters/b.yarn': 'title: B\n---\nAdiós.\n===\n',
      }),
    )
    expect(result.errors).toEqual([])
    expect(result.json).toContain('Start')
    expect(result.hash).toMatch(/^[0-9a-f]{12}$/)
    expect(result.files).toHaveLength(3)
  })

  it('reports Yarn errors with file and line', () => {
    const result = compileYarnProject(projectWith({ 'a.yarn': 'title: Start\n---\n<<if $x>>\nHola\n===\n' }))
    expect(result.json).toBeNull()
    expect(result.errors.join('\n')).toMatch(/a\.yarn:\d+:\d+ YS\d+/)
  })

  it('never compiles files outside the project folder', () => {
    const result = compileYarnProject(projectWith({ 'a.yarn': 'title: Start\n---\nHola.\n===\n' }, ['../**/*.yarn']))
    expect(result.json).toBeNull()
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects sources reached through a symlinked folder outside the project', () => {
    const outside = mkdtempSync(join(tmpdir(), 'yarn-outside-'))
    writeFileSync(join(outside, 'secret.yarn'), 'title: Secret\n---\nTop secret.\n===\n')
    const project = projectWith({ 'a.yarn': 'title: Start\n---\nHola.\n===\n' })
    try {
      symlinkSync(outside, join(project, '..', 'linked'), 'junction') // junctions need no admin rights on Windows
    } catch {
      return // symlinks unavailable on this machine
    }
    const result = compileYarnProject(project)
    expect(result.json).toBeNull()
    expect(result.errors[0]).toContain('outside the project folder')
  })

  it('fails the build on a jump loop that would freeze the game', () => {
    const result = compileYarnProject(projectWith({ 'a.yarn': 'title: Start\n---\n<<jump Start>>\n===\n' }))
    expect(result.json).toBeNull()
    expect(result.errors[0]).toContain('Infinite loop: Start → Start')
  })

  it('only warns about loops that depend on variables', () => {
    const result = compileYarnProject(
      projectWith({
        'a.yarn': 'title: Start\n---\n<<declare $n = 0>>\n<<if $n < 2>>\n<<set $n = $n + 1>>\n<<jump Start>>\n<<endif>>\nFin.\n===\n',
      }),
    )
    expect(result.json).not.toBeNull()
    expect(result.warnings[0]).toContain('Possible infinite loop')
  })

  it('compiles the real escape story with no errors, warnings or loops', () => {
    const result = compileYarnProject(join(import.meta.dirname, '../../src/stories/escape/dialogue/escape.yarnproject'))
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(findContentFreeLoops(JSON.parse(result.json ?? '{}') as ProgramLike)).toEqual({ unconditional: [], conditional: [] })
  })

  it('fails cleanly for a missing or invalid project file', () => {
    expect(compileYarnProject(join(tmpdir(), 'missing', 'x.yarnproject')).errors.length).toBeGreaterThan(0)
    const dir = mkdtempSync(join(tmpdir(), 'yarn-'))
    writeFileSync(join(dir, 'bad.yarnproject'), '{ nope')
    expect(compileYarnProject(join(dir, 'bad.yarnproject')).json).toBeNull()
  })
})
