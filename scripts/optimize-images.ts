/**
 * Converts source images (jpg/png/webp/avif) into size-capped WebP files for a story
 * and writes `dimensions.json`, used to reserve layout space (no layout shift).
 *
 *   npm run images -- --src <folder-with-originals> --story <storyId> [--width 1600] [--quality 72] [--only a,b]
 *
 * `--only` re-encodes just the named images (e.g. puzzle clues with fine print at a higher
 * quality) and merges them into the existing dimensions.json.
 *
 * Originals are not needed at runtime; keep them outside the app (e.g. a design drive).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const STORY_ID = /^[a-z0-9-]+$/

const { values } = parseArgs({
  options: {
    src: { type: 'string' },
    story: { type: 'string' },
    width: { type: 'string', default: '1600' },
    quality: { type: 'string', default: '72' },
    only: { type: 'string' },
  },
})

if (!values.src || !values.story || !STORY_ID.test(values.story)) {
  console.error('Usage: npm run images -- --src <folder> --story <storyId> [--width 1600] [--quality 72] [--only a,b]')
  process.exit(1)
}

const maxWidth = Number(values.width)
const quality = Number(values.quality)
const sourceDir = resolve(values.src)
const outDir = join(import.meta.dirname, '..', 'src', 'stories', values.story, 'images')
mkdirSync(outDir, { recursive: true })

const only = values.only ? new Set(values.only.split(',').map((name) => name.trim().toLowerCase())) : null
const dimensionsFile = join(outDir, 'dimensions.json')
const dimensions: Record<string, { width: number; height: number }> =
  only && existsSync(dimensionsFile) ? JSON.parse(readFileSync(dimensionsFile, 'utf8')) : {}
let converted = 0
let bytesIn = 0
let bytesOut = 0

for (const file of readdirSync(sourceDir).sort()) {
  if (!SOURCE_EXTENSIONS.has(extname(file).toLowerCase())) continue
  const name = basename(file, extname(file)).toLowerCase()
  if (only && !only.has(name)) continue
  const input = join(sourceDir, file)
  const output = join(outDir, `${name}.webp`)

  const info = await sharp(input)
    .rotate() // honour EXIF orientation
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(output)

  dimensions[name] = { width: info.width, height: info.height }
  converted++
  bytesIn += statSync(input).size
  bytesOut += info.size
  console.log(`  ${file.padEnd(24)} → ${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
}

writeFileSync(dimensionsFile, `${JSON.stringify(dimensions, null, 2)}\n`)
const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`
console.log(`\n${converted} images: ${kb(bytesIn)} → ${kb(bytesOut)}`)
