/**
 * Build-time Yarn Spinner compilation, shared by the Vite plugin and `npm run dialogue:check`.
 * The browser bundle only ships the runtime (`Dialogue`) plus the compiled program JSON.
 */
import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative } from 'node:path'
import type { Diagnostic } from 'yarnspinner-typescript'
import { loadYarnProject } from 'yarnspinner-typescript/node'
import { findContentFreeLoops, type ProgramLike } from './loops.ts'

export interface DialogueCompileResult {
  /** Compiled program JSON, ready for `new Dialogue(JSON.parse(json))`. Null when compilation failed. */
  readonly json: string | null
  /** Short content hash of the program; invalidates saves made with older story versions. */
  readonly hash: string | null
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
  /** Every `.yarn` file that took part (absolute paths), plus the project file. */
  readonly files: readonly string[]
}

const HASH_LENGTH = 12

export function compileYarnProject(projectFile: string): DialogueCompileResult {
  const projectDir = dirname(projectFile)
  try {
    const result = loadYarnProject(projectFile)
    const sources = result.sources.map((source) => join(projectDir, source))
    const files = [projectFile, ...sources]

    // Sources must stay inside the project folder, so a story can never embed arbitrary files.
    // Compare real paths too: a symlinked file or folder has an in-tree name but reads from elsewhere.
    const realProjectDir = realpathSync(projectDir)
    const escaped = sources.filter((file) => isOutside(projectDir, file) || isOutside(realProjectDir, realpathSync(file)))
    if (escaped.length > 0) {
      return failure(files, [`Source files outside the project folder are not allowed: ${escaped.join(', ')}`])
    }

    const errors = result.diagnostics.filter((d) => d.severity === 'error').map(formatDiagnostic)
    const warnings = result.diagnostics.filter((d) => d.severity === 'warning').map(formatDiagnostic)
    if (errors.length > 0 || !result.program) {
      return { ...failure(files, errors.length > 0 ? errors : ['Compilation produced no program']), warnings }
    }
    if (sources.length === 0) return failure(files, ['The project has no .yarn source files'])

    const loops = findContentFreeLoops(result.program as unknown as ProgramLike)
    const describe = (cycle: readonly string[]) => cycle.join(' → ')
    if (loops.unconditional.length > 0) {
      return failure(
        files,
        loops.unconditional.map((cycle) => `Infinite loop: ${describe(cycle)} jumps forever without any line, command or options (the game would freeze)`),
      )
    }
    const loopWarnings = loops.conditional.map(
      (cycle) => `Possible infinite loop: ${describe(cycle)} can jump forever without content for some variable values`,
    )

    const json = JSON.stringify(result.program)
    const hash = createHash('sha256').update(json).digest('hex').slice(0, HASH_LENGTH)
    return { json, hash, errors: [], warnings: [...warnings, ...loopWarnings], files }
  } catch (error) {
    return failure([projectFile], [error instanceof Error ? error.message : String(error)])
  }
}

function isOutside(root: string, file: string): boolean {
  const fromRoot = relative(root, file)
  return fromRoot.startsWith('..') || isAbsolute(fromRoot)
}

function failure(files: readonly string[], errors: readonly string[]): DialogueCompileResult {
  return { json: null, hash: null, errors, warnings: [], files }
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  const where = diagnostic.range ? `:${diagnostic.range.startLine}:${diagnostic.range.startCol + 1}` : ''
  return `${diagnostic.file ?? '?'}${where} ${diagnostic.code}: ${diagnostic.message}`
}
