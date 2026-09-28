import { useStoryContext } from '../app/story-context'
import styles from './Screens.module.css'

interface TitleScreenProps {
  readonly canContinue: boolean
  readonly onNewGame: () => void
  readonly onContinue: () => void
}

export function TitleScreen({ canContinue, onNewGame, onContinue }: TitleScreenProps) {
  const { story, strings } = useStoryContext()
  const { meta } = story
  const cover = meta.cover ? story.images[meta.cover] : undefined

  return (
    <main className={styles.title}>
      {cover && (
        <img className={styles.cover} src={cover.src} width={cover.width} height={cover.height} alt="" fetchPriority="high" />
      )}
      <div className={styles.titleCard}>
        <h1 className={styles.brand}>
          {meta.title} <span>{meta.tagline}</span>
        </h1>
        <p>{meta.description}</p>
        {meta.timeLimitMinutes !== null && <p className={styles.muted}>{strings.timeLimit(meta.timeLimitMinutes)}</p>}
        <div className={styles.actions}>
          {canContinue && (
            <button type="button" className="button" onClick={onContinue}>
              {strings.continueGame}
            </button>
          )}
          <button type="button" className={canContinue ? 'button button-ghost' : 'button'} onClick={onNewGame}>
            {canContinue ? strings.restartGame : strings.newGame}
          </button>
        </div>
      </div>
      <footer className={styles.credits}>{meta.credits}</footer>
    </main>
  )
}
