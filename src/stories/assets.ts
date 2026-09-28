/**
 * Helpers that turn `import.meta.glob` results into story asset maps keyed by file name,
 * so adding `images/foo.webp` or `audio/music/foo.opus` makes `# image: foo` / `# music: foo` work.
 */
import type { StoryImage } from './types'

type UrlGlob = Readonly<Record<string, string>>
type Dimensions = Readonly<Record<string, { readonly width: number; readonly height: number }>>

const FILE_KEY = /([^/\\]+)\.[a-z0-9]+$/i

export function keyFromPath(path: string): string {
  const match = FILE_KEY.exec(path)
  if (!match) throw new Error(`Cannot derive an asset key from "${path}"`)
  return match[1].toLowerCase()
}

export function collectUrls(glob: UrlGlob): Record<string, string> {
  return Object.fromEntries(Object.entries(glob).map(([path, url]) => [keyFromPath(path), url]))
}

export function collectImages(glob: UrlGlob, dimensions: Dimensions): Record<string, StoryImage> {
  return Object.fromEntries(
    Object.entries(glob).map(([path, src]) => {
      const key = keyFromPath(path)
      const size = dimensions[key]
      if (!size) throw new Error(`Missing dimensions for image "${key}"; run npm run images`)
      return [key, { src, width: size.width, height: size.height }]
    }),
  )
}

export function assertHttpsLinks(links: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  for (const [key, url] of Object.entries(links)) {
    if (new URL(url).protocol !== 'https:') throw new Error(`Link "${key}" must use https`)
  }
  return links
}
