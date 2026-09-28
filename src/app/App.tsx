import { Suspense, use } from 'react'
import { getStrings } from '../i18n/strings'
import { localizeStory } from '../stories/locale'
import { loadStory } from '../stories/registry'
import type { StoryDefinition } from '../stories/types'
import { ErrorBoundary } from './ErrorBoundary'
import type { Services } from './services'
import { StoryApp } from './StoryApp'
import { useLocalePreference } from './use-locale-preference'

interface AppProps {
  readonly storyId: string
  readonly services: Services
}

// Loading/error chrome appears before the story (and its languages) are known: use the browser's language.
const bootStrings = getStrings(typeof navigator === 'undefined' ? 'es' : navigator.language)

export function App({ storyId, services }: AppProps) {
  return (
    <ErrorBoundary fallback={<p className="app-status" role="alert">{bootStrings.loadFailed}</p>}>
      <Suspense fallback={<p className="app-status">{bootStrings.loading}</p>}>
        <StoryLoader storyId={storyId} services={services} />
      </Suspense>
    </ErrorBoundary>
  )
}

function StoryLoader({ storyId, services }: AppProps) {
  const story = use(loadStory(storyId))
  return <LocalizedStoryApp key={story.id} story={story} services={services} />
}

interface LocalizedStoryAppProps {
  readonly story: StoryDefinition
  readonly services: Services
}

/** Keeps the chosen language; a language change remounts the story (new engine, audio and save slot). */
function LocalizedStoryApp({ story, services }: LocalizedStoryAppProps) {
  const [locale, setLocale] = useLocalePreference(story)
  return <StoryApp key={locale} story={localizeStory(story, locale)} services={services} onLocaleChange={setLocale} />
}
