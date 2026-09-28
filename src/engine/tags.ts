/**
 * ink tag grammar: `# key` or `# key: value`. Keys are case-insensitive.
 * `args` splits the value on whitespace, for tags whose values are identifiers
 * (e.g. `# input: respuesta password`); free text tags (`# hint: ...`) use `value`.
 */
export interface ParsedTag {
  readonly key: string
  readonly value: string
  readonly args: readonly string[]
}

export const IDENTIFIER = /^[a-z0-9_-]+$/i

export function parseTag(raw: string): ParsedTag {
  const trimmed = raw.trim()
  const colon = trimmed.indexOf(':')
  if (colon === -1) return { key: trimmed.toLowerCase(), value: '', args: [] }

  const value = trimmed.slice(colon + 1).trim()
  return {
    key: trimmed.slice(0, colon).trim().toLowerCase(),
    value,
    args: value.split(/\s+/).filter(Boolean),
  }
}
