import { useEffect, useRef } from 'react'
import { useStoryContext } from '../app/story-context'
import type { StorySnapshot } from '../engine/types'
import { ChoicePanel } from './ChoicePanel'
import { EndPanel } from './EndPanel'
import { HintList } from './HintList'
import { PageView } from './PageView'
import { PlayClock } from './PlayClock'
import styles from './Screens.module.css'
import { SoundToggle } from './SoundToggle'

export interface StoryActions {
  readonly choose: (index: number) => void
  readonly submit: (value: string) => void
  readonly revealHint: (index: number) => void
  readonly playAgain: () => void
  readonly menu: () => void
  readonly retry: () => void
}

interface StoryScreenProps {
  readonly snapshot: StorySnapshot
  readonly actions: StoryActions
  readonly muted: boolean
  readonly hasAudio: boolean
  readonly onMutedChange: (muted: boolean) => void
}

export function StoryScreen({ snapshot, actions, muted, hasAudio, onMutedChange }: StoryScreenProps) {
  const { story, strings } = useStoryContext()
  const { page, presentation, status } = snapshot
  const scene = presentation.scene ? story.images[presentation.scene] : undefined
  const articleRef = useRef<HTMLElement>(null)

  // New page: move focus to the text (announced by screen readers) and scroll to top.
  const pageId = page?.id
  useEffect(() => {
    if (pageId === undefined) return
    articleRef.current?.focus({ preventScroll: true })
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo?.({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [pageId])

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button type="button" className="button button-ghost button-small" onClick={actions.menu}>
          {strings.menu}
        </button>
        <h1 className={styles.brandSmall}>
          {story.meta.title} <span>{story.meta.tagline}</span>
        </h1>
        <PlayClock playtimeMs={snapshot.playtimeMs} resumedAt={snapshot.resumedAt} limitMinutes={story.meta.timeLimitMinutes} />
        {hasAudio && <SoundToggle muted={muted} onChange={onMutedChange} />}
      </header>

      {scene && <img className={styles.scene} src={scene.src} width={scene.width} height={scene.height} alt="" fetchPriority="high" />}

      <main className={styles.content}>
        {status === 'error' ? (
          <section role="alert" className={styles.error}>
            <h2>{strings.errorTitle}</h2>
            <p>{snapshot.error}</p>
            <div className={styles.actions}>
              <button type="button" className="button" onClick={actions.retry}>
                {strings.retry}
              </button>
              <button type="button" className="button button-ghost" onClick={actions.menu}>
                {strings.menu}
              </button>
            </div>
          </section>
        ) : (
          page && (
            <div key={page.id} className={styles.page}>
              <article ref={articleRef} tabIndex={-1} className={styles.article} data-outcome={page.outcome ?? undefined}>
                <PageView blocks={page.blocks} />
              </article>
              {status === 'ended' ? (
                <EndPanel stats={snapshot.stats} playtimeMs={snapshot.playtimeMs} onPlayAgain={actions.playAgain} onMenu={actions.menu} />
              ) : (
                <>
                  <HintList hints={page.hints} onReveal={actions.revealHint} />
                  <ChoicePanel choices={page.choices} input={page.input} onChoose={actions.choose} onSubmit={actions.submit} />
                </>
              )}
            </div>
          )
        )}
      </main>

      <footer className={styles.credits}>{story.meta.credits}</footer>
    </div>
  )
}
