import { createContext, useContext } from 'react'
import type { UiStrings } from '../i18n/strings'
import type { StoryDefinition } from '../stories/types'

export interface StoryContextValue {
  readonly story: StoryDefinition
  readonly strings: UiStrings
}

/** Low-frequency, read-only data (assets, links, strings) needed deep in the tree. */
export const StoryContext = createContext<StoryContextValue | null>(null)

export function useStoryContext(): StoryContextValue {
  const value = useContext(StoryContext)
  if (!value) throw new Error('useStoryContext must be used inside <StoryContext>')
  return value
}
