/**
 * Compiles every story's root ink file (src/stories/<id>/ink/main.ink) and fails on errors.
 * Run in CI and before builds: `npm run ink:check`.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { compileInkFile } from '../tooling/ink/compile.ts'

const STORIES_DIR = join(import.meta.dirname, '..', 'src', 'stories')

const roots = readdirSync(STORIES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(STORIES_DIR, entry.name, 'ink', 'main.ink'))
  .filter((file) => existsSync(file))

let failed = false
for (const root of roots) {
  const result = compileInkFile(root)
  const label = relative(process.cwd(), root)
  for (const warning of result.warnings) console.warn(`  warn  ${label}: ${warning}`)
  if (result.errors.length > 0) {
    failed = true
    for (const error of result.errors) console.error(`  error ${label}: ${error}`)
  } else {
    console.log(`  ok    ${label} (${result.files.length} files, hash ${result.hash})`)
  }
}

if (roots.length === 0) console.warn('No stories found under src/stories/*/ink/main.ink')
process.exit(failed ? 1 : 0)
