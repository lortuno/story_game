/**
 * Vite plugin: `import dialogue from './dialogue/escape.yarnproject'` compiles the whole
 * Yarn Spinner project at build/dev time and exports `{ json, hash }`.
 * The program JSON is embedded as a string literal (parses faster than an object literal).
 * Editing any .yarn file of the project reloads the story.
 */
import { dirname } from 'node:path'
import type { Plugin } from 'vite'
import { compileYarnProject } from './compile.ts'

const PROJECT_FILE = /\.yarnproject$/
const YARN_FILE = /\.yarn$/

export function yarnPlugin(): Plugin {
  const projects = new Set<string>()

  return {
    name: 'story-game:yarn',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0]
      if (!PROJECT_FILE.test(file)) return null

      projects.add(file)
      const result = compileYarnProject(file)
      for (const dependency of result.files) this.addWatchFile(dependency)
      for (const warning of result.warnings) this.warn(warning)
      if (result.json === null) {
        this.error(`Yarn compilation failed for ${file}:\n  ${result.errors.join('\n  ')}`)
      }

      return {
        code: `export default { json: ${JSON.stringify(result.json)}, hash: ${JSON.stringify(result.hash)} }`,
        map: null,
      }
    },
    handleHotUpdate({ file, server }) {
      if (!YARN_FILE.test(file) && !PROJECT_FILE.test(file)) return
      // A changed (or new) .yarn file invalidates the project that contains it.
      const normalized = file.replaceAll('\\', '/')
      for (const project of projects) {
        // Trailing slash: "dialogue/" must not match a sibling folder like "dialogue-old/".
        if (!normalized.startsWith(`${dirname(project).replaceAll('\\', '/')}/`)) continue
        const mod = server.moduleGraph.getModuleById(project)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
      server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}
