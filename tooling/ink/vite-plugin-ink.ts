/**
 * Vite plugin: `import story from './main.ink'` compiles ink at build/dev time.
 * The module exports `{ json, hash }`; the JSON is embedded as a string literal,
 * which parses faster than an equivalent object literal.
 * Included files are watched, so editing any chapter hot-reloads the story.
 */
import type { Plugin } from 'vite'
import { compileInkFile } from './compile.ts'

const INK_FILE = /\.ink$/

export function inkPlugin(): Plugin {
  return {
    name: 'story-game:ink',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0]
      if (!INK_FILE.test(file)) return null

      const result = compileInkFile(file)
      for (const dependency of result.files) this.addWatchFile(dependency)
      for (const warning of result.warnings) this.warn(warning)

      if (result.json === null) {
        this.error(`ink compilation failed for ${file}:\n  ${result.errors.join('\n  ')}`)
      }

      return {
        code: `export default { json: ${JSON.stringify(result.json)}, hash: ${JSON.stringify(result.hash)} }`,
        map: null,
      }
    },
    handleHotUpdate({ file, server }) {
      // A changed chapter must invalidate the root .ink module that INCLUDEs it.
      if (!INK_FILE.test(file)) return
      const roots = [...server.moduleGraph.idToModuleMap.values()].filter(
        (mod) => mod.id && INK_FILE.test(mod.id),
      )
      for (const mod of roots) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}
