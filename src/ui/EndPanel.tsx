import { useStoryContext } from '../app/story-context'
import type { PlayStats } from '../engine/types'
import styles from './Controls.module.css'
import { formatDuration } from './format'

interface EndPanelProps {
  readonly stats: PlayStats
  readonly playtimeMs: number
  readonly onPlayAgain: () => void
  readonly onMenu: () => void
}

export function EndPanel({ stats, playtimeMs, onPlayAgain, onMenu }: EndPanelProps) {
  const { story, strings } = useStoryContext()
  const limit = story.meta.timeLimitMinutes

  return (
    <section className={styles.end} aria-labelledby="end-title">
      <h2 id="end-title" className={styles.sectionTitle}>
        {strings.endTitle}
      </h2>
      <p className={styles.endTime}>
        {formatDuration(playtimeMs)}
        {limit !== null && <span className={styles.clockLimit}> / {limit}:00</span>}
      </p>
      <p>{strings.endStats({ choices: stats.choices, hints: stats.hintsRevealed, failures: stats.failures })}</p>
      <div className={styles.actions}>
        <button type="button" className="button" onClick={onPlayAgain}>
          {strings.playAgain}
        </button>
        <button type="button" className="button button-ghost" onClick={onMenu}>
          {strings.menu}
        </button>
      </div>
    </section>
  )
}
