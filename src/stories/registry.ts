/**
 * Available stories. Each one is a lazily-loaded chunk (ink JSON + asset map),
 * so adding stories doesn't grow the initial bundle.
 */
import type { StoryDefinition } from './types'

type StoryLoader = () => Promise<{ readonly default: StoryDefinition }>

export const storyRegistry: Readonly<Record<string, StoryLoader>> = {
  escape: () => import('./escape'),
}

export const DEFAULT_STORY_ID = 'escape'

/** Picks the story from `?story=<id>`, falling back to the default for unknown ids. */
export function resolveStoryId(search: string): string {
  const requested = new URLSearchParams(search).get('story')
  return requested && Object.hasOwn(storyRegistry, requested) ? requested : DEFAULT_STORY_ID
}

const cache = new Map<string, Promise<StoryDefinition>>()

/** Cached so React's `use()` receives the same promise on every render. */
export function loadStory(id: string): Promise<StoryDefinition> {
  const loader = storyRegistry[id]
  if (!loader) return Promise.reject(new Error(`Unknown story "${id}"`))
  let pending = cache.get(id)
  if (!pending) {
    pending = loader().then((module) => module.default)
    cache.set(id, pending)
  }
  return pending
}
