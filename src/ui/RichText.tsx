import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useStoryContext } from '../app/story-context'
import type { Mark, StyledText } from '../engine/types'
import styles from './RichText.module.css'

interface RichTextProps {
  readonly text: StyledText
}

type InteractiveMark = Extract<Mark, { kind: 'link' | 'tip' }>
type BoldMark = Extract<Mark, { kind: 'bold' }>

/**
 * Renders story text with its Yarn markup as React nodes; never uses innerHTML.
 * Links and tips are interactive wrappers (non-overlapping); bold can appear anywhere, also inside them.
 */
export function RichText({ text }: RichTextProps) {
  const { story, strings } = useStoryContext()
  const source = text.text
  const bold = text.marks.filter((mark): mark is BoldMark => mark.kind === 'bold')
  const interactive = nonOverlapping(text.marks.filter((mark): mark is InteractiveMark => mark.kind !== 'bold'))

  const nodes: ReactNode[] = []
  let cursor = 0
  for (const mark of interactive) {
    nodes.push(...withBold(source, cursor, mark.start, bold))
    const label = withBold(source, mark.start, mark.end, bold)
    if (mark.kind === 'tip') {
      nodes.push(<Toggletip key={`tip-${mark.start}`} label={label} tip={mark.tip} />)
    } else {
      const href = story.links[mark.key]
      nodes.push(
        href ? (
          <a key={`link-${mark.start}`} href={href} target="_blank" rel="noopener noreferrer">
            {label}
            <span className="visually-hidden"> {strings.opensInNewTab}</span>
          </a>
        ) : (
          // Unknown key: show the label, never a raw URL.
          <span key={`link-${mark.start}`}>{label}</span>
        ),
      )
    }
    cursor = mark.end
  }
  nodes.push(...withBold(source, cursor, source.length, bold))
  return nodes
}

/** Sorted by position; a mark that overlaps an earlier one is dropped. */
function nonOverlapping(marks: readonly InteractiveMark[]): InteractiveMark[] {
  const kept: InteractiveMark[] = []
  for (const mark of [...marks].sort((a, b) => a.start - b.start)) {
    if (mark.end > mark.start && mark.start >= (kept.at(-1)?.end ?? 0)) kept.push(mark)
  }
  return kept
}

/** Text between `from` and `to`, with bold ranges clipped to that window. */
function withBold(source: string, from: number, to: number, bold: readonly BoldMark[]): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = from
  const ranges = bold
    .map((mark) => ({ start: Math.max(mark.start, from), end: Math.min(mark.end, to) }))
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start)

  for (const range of ranges) {
    if (range.start < cursor) continue // overlapping bold ranges: keep the first
    if (range.start > cursor) nodes.push(source.slice(cursor, range.start))
    nodes.push(<strong key={`b-${range.start}`}>{source.slice(range.start, range.end)}</strong>)
    cursor = range.end
  }
  if (to > cursor) nodes.push(source.slice(cursor, to))
  return nodes
}

interface ToggletipProps {
  readonly label: ReactNode
  readonly tip: string
}

/** Hover or focus+click reveals the tip; works with touch and keyboard (Esc closes). */
function Toggletip({ label, tip }: ToggletipProps) {
  const [open, setOpen] = useState(false)
  const tipId = useId()

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <span className={styles.tip} data-open={open || undefined}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-describedby={tipId}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      >
        {label}
      </button>
      <span role="tooltip" id={tipId} className={styles.bubble}>
        {tip}
      </span>
    </span>
  )
}
