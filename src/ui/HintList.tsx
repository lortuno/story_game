import type { SyntheticEvent } from 'react'
import { useStoryContext } from '../app/story-context'
import type { Hint } from '../engine/types'
import styles from './Controls.module.css'
import { RichText } from './RichText'

interface HintListProps {
  readonly hints: readonly Hint[]
  readonly onReveal: (index: number) => void
}

/** Progressive hints as native disclosure widgets (keyboard and screen-reader friendly). */
export function HintList({ hints, onReveal }: HintListProps) {
  const { strings } = useStoryContext()
  if (hints.length === 0) return null

  const onToggle = (index: number) => (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) onReveal(index)
  }

  return (
    <section className={styles.hints} aria-labelledby="hints-title">
      <h2 id="hints-title" className={styles.sectionTitle}>
        {strings.hintsTitle}
      </h2>
      {hints.map((hint, index) => (
        <details key={index} className={styles.hint} onToggle={onToggle(index)}>
          <summary>{hint.summary}</summary>
          <p>
            <RichText text={hint.body} />
          </p>
        </details>
      ))}
    </section>
  )
}
