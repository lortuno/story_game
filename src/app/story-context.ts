import { createContext, useContext } from 'react'
import type { UiStrings } from '../i18n/strings'
import type { LocalizedStory } from '../stories/types'

export interface StoryContextValue {
  readonly story: LocalizedStory
  readonly strings: UiStrings
  /** Switches the whole story to another available language. */
  readonly changeLocale: (locale: string) => void
}

/** Low-frequency, read-only data (assets, links, strings) needed deep in the tree. */
export const StoryContext = createContext<StoryContextValue | null>(null)

export function useStoryContext(): StoryContextValue {
  const value = useContext(StoryContext)
  if (!value) throw new Error('useStoryContext must be used inside <StoryContext>')
  return value
}
