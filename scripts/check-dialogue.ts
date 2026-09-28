/**
 * Compiles every story's Yarn project (src/stories/<id>/dialogue/*.yarnproject) and fails on errors.
 * Run in CI and before builds: `npm run dialogue:check`.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { compileYarnProject } from '../tooling/yarn/compile.ts'

const STORIES_DIR = join(import.meta.dirname, '..', 'src', 'stories')

const projects = readdirSync(STORIES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(STORIES_DIR, entry.name, 'dialogue'))
  .filter((dir) => existsSync(dir))
  .flatMap((dir) => readdirSync(dir).filter((name) => name.endsWith('.yarnproject')).map((name) => join(dir, name)))

let failed = false
for (const project of projects) {
  const result = compileYarnProject(project)
  const label = relative(process.cwd(), project)
  for (const warning of result.warnings) console.warn(`  warn  ${label}: ${warning}`)
  if (result.errors.length > 0) {
    failed = true
    for (const error of result.errors) console.error(`  error ${label}: ${error}`)
  } else {
    console.log(`  ok    ${label} (${result.files.length - 1} .yarn files, hash ${result.hash})`)
  }
}

if (projects.length === 0) console.warn('No stories found under src/stories/*/dialogue/*.yarnproject')
process.exit(failed ? 1 : 0)
