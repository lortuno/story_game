import { Suspense, use } from 'react'
import { getStrings } from '../i18n/strings'
import { loadStory } from '../stories/registry'
import { ErrorBoundary } from './ErrorBoundary'
import type { Services } from './services'
import { StoryApp } from './StoryApp'

interface AppProps {
  readonly storyId: string
  readonly services: Services
}

// Loading/error chrome appears before the story (and its language) is known.
const bootStrings = getStrings(document.documentElement.lang || 'es')

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
  return <StoryApp key={story.id} story={story} services={services} />
}
