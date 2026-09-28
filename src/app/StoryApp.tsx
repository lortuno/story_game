import { useEffect, useState, useSyncExternalStore } from 'react'
import { AudioManager } from '../audio/audio-manager'
import { StoryController } from '../engine/story-controller'
import { getStrings } from '../i18n/strings'
import type { StoryDefinition } from '../stories/types'
import { StoryScreen, type StoryActions } from '../ui/StoryScreen'
import { TitleScreen } from '../ui/TitleScreen'
import type { Services } from './services'
import { StoryContext } from './story-context'
import { useMutedPreference } from './use-muted-preference'

interface StoryAppProps {
  readonly story: StoryDefinition
  readonly services: Services
}

/** Wires one story to the engine, audio and UI. */
export function StoryApp({ story, services }: StoryAppProps) {
  const [controller] = useState(
    () => new StoryController({ storyId: story.id, ink: story.ink, events: services.events, saves: services.saves }),
  )
  const [audio] = useState(() => new AudioManager(story.audio))
  const [context] = useState(() => ({ story, strings: getStrings(story.meta.lang) }))
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [muted, setMuted] = useMutedPreference()

  const music = snapshot.status === 'title' ? null : snapshot.presentation.music
  const page = snapshot.page
  const hasAudio = Object.keys(story.audio.music).length + Object.keys(story.audio.sfx).length > 0

  useEffect(() => {
    audio.setMuted(muted)
  }, [audio, muted])

  useEffect(() => {
    audio.playMusic(music)
  }, [audio, music])

  useEffect(() => {
    for (const effect of page?.sfx ?? []) audio.playSfx(effect)
  }, [audio, page])

  useEffect(() => () => audio.stopAll(), [audio])

  // Keep playtime when the tab is hidden or closed.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') controller.persist()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [controller])

  const actions: StoryActions = {
    choose: (index) => controller.choose(index),
    submit: (value) => controller.submitInput(value),
    revealHint: (index) => controller.revealHint(index),
    playAgain: () => controller.start(),
    menu: () => controller.persist({ exitToTitle: true }),
    retry: () => {
      if (!controller.resume()) controller.persist({ exitToTitle: true })
    },
  }

  return (
    <StoryContext value={context}>
      <title>{`${story.meta.title} · ${story.meta.tagline}`}</title>
      {snapshot.status === 'title' ? (
        <TitleScreen
          canContinue={controller.hasSave()}
          onNewGame={() => controller.start()}
          onContinue={() => controller.resume() || controller.start()}
        />
      ) : (
        <StoryScreen snapshot={snapshot} actions={actions} muted={muted} hasAudio={hasAudio} onMutedChange={setMuted} />
      )}
    </StoryContext>
  )
}
