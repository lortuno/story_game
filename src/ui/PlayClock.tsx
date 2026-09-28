import { useEffect, useState } from 'react'
import { useStoryContext } from '../app/story-context'
import styles from './Controls.module.css'
import { formatDuration } from './format'

interface PlayClockProps {
  readonly playtimeMs: number
  /** Null when the clock is stopped. */
  readonly resumedAt: number | null
  readonly limitMinutes: number | null
}

const TICK_MS = 1000

/** Ticks locally so only this component re-renders every second. */
export function PlayClock({ playtimeMs, resumedAt, limitMinutes }: PlayClockProps) {
  const { strings } = useStoryContext()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (resumedAt === null) return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [resumedAt])

  const elapsed = resumedAt === null ? playtimeMs : playtimeMs + Math.max(0, now - resumedAt)
  const overLimit = limitMinutes !== null && elapsed > limitMinutes * 60_000

  return (
    <span className={styles.clock} data-over={overLimit || undefined} title={strings.playtime} role="timer">
      <span className="visually-hidden">{strings.playtime}: </span>
      {formatDuration(elapsed)}
      {limitMinutes !== null && <span className={styles.clockLimit}> / {limitMinutes}:00</span>}
    </span>
  )
}
