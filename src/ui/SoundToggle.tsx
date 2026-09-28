import { useStoryContext } from '../app/story-context'
import styles from './Controls.module.css'

interface SoundToggleProps {
  readonly muted: boolean
  readonly onChange: (muted: boolean) => void
}

export function SoundToggle({ muted, onChange }: SoundToggleProps) {
  const { strings } = useStoryContext()
  const label = muted ? strings.soundOn : strings.soundOff

  return (
    <button type="button" className={styles.iconButton} aria-pressed={muted} aria-label={label} title={label} onClick={() => onChange(!muted)}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" />
        {muted ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
      </svg>
    </button>
  )
}
