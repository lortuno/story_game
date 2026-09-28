/**
 * Build-time ink compilation, shared by the Vite plugin and `npm run ink:check`.
 * Uses the full inkjs build (with compiler); the browser bundle only ships the runtime.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { Compiler, CompilerOptions } from 'inkjs/full'

export interface InkCompileResult {
  /** Compiled story JSON, ready for `new Story(json)`. Null when compilation failed. */
  readonly json: string | null
  /** Short content hash of the compiled JSON; invalidates saves made with older story versions. */
  readonly hash: string | null
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
  /** Every `.ink` file that took part in the compilation (root + INCLUDEs), absolute paths. */
  readonly files: readonly string[]
}

const HASH_LENGTH = 12

export function compileInkFile(rootFile: string): InkCompileResult {
  const rootDir = dirname(rootFile)
  const files = new Set<string>([rootFile])
  const errors: string[] = []
  const warnings: string[] = []

  // INCLUDE paths resolve relative to the root file, which is how inky behaves too.
  // Includes must stay inside the story folder so a story can never read arbitrary files.
  const fileHandler = {
    ResolveInkFilename: (filename: string) => {
      const full = resolve(rootDir, filename)
      const fromRoot = relative(rootDir, full)
      // On Windows, relative() to another drive returns an absolute path instead of "..".
      if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
        throw new Error(`INCLUDE outside story folder is not allowed: ${filename}`)
      }
      return full
    },
    LoadInkFileContents: (filename: string) => {
      files.add(filename)
      return readFileSync(filename, 'utf8')
    },
  }

  const collect = (message: string, type: number) => {
    // inkjs ErrorType: 0 = author message, 1 = warning, 2 = error
    if (type === 2) errors.push(message)
    else warnings.push(message)
  }

  try {
    const source = readFileSync(rootFile, 'utf8')
    const options = new CompilerOptions(rootFile, [], false, collect, fileHandler)
    const story = new Compiler(source, options).Compile()
    if (errors.length > 0 || !story) {
      return { json: null, hash: null, errors, warnings, files: [...files] }
    }
    const json = story.ToJson() as string
    const hash = createHash('sha256').update(json).digest('hex').slice(0, HASH_LENGTH)
    return { json, hash, errors, warnings, files: [...files] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { json: null, hash: null, errors: [...errors, message], warnings, files: [...files] }
  }
}
