/**
 * Minimal inline markup for story text. Parsed into tokens (never into HTML strings),
 * so story content can't inject markup into the page.
 *
 *   **bold**          strong emphasis
 *   [label](key)      external link; `key` is looked up in the story's `links` map
 *   [label](?tip)     tooltip / toggletip with the text after `?`
 */
export type InlineToken =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string }
  | { readonly kind: 'link'; readonly label: string; readonly key: string }
  | { readonly kind: 'tip'; readonly label: string; readonly tip: string }

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g

export function parseInline(source: string): readonly InlineToken[] {
  const tokens: InlineToken[] = []
  let cursor = 0

  for (const match of source.matchAll(INLINE)) {
    const start = match.index
    if (start > cursor) tokens.push({ kind: 'text', text: source.slice(cursor, start) })

    const [whole, strong, label, target] = match
    if (strong !== undefined) tokens.push({ kind: 'strong', text: strong })
    else if (target.startsWith('?')) tokens.push({ kind: 'tip', label, tip: target.slice(1).trim() })
    else tokens.push({ kind: 'link', label, key: target.trim() })

    cursor = start + whole.length
  }

  if (cursor < source.length) tokens.push({ kind: 'text', text: source.slice(cursor) })
  return tokens
}

/** Plain text of a marked-up string (for alt text, aria labels and event payloads). */
export function toPlainText(source: string): string {
  return parseInline(source)
    .map((token) => (token.kind === 'text' || token.kind === 'strong' ? token.text : token.label))
    .join('')
}
