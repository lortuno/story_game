import { useState } from 'react'
import { resolveLocale } from '../stories/locale'
import type { StoryDefinition } from '../stories/types'

const KEY = 'story-game:locale'

/**
 * The player's language: `?lang=` > remembered choice > browser language > story default.
 * Changing it remembers the choice and keeps `?lang=` in the address in sync (shareable links).
 */
export function useLocalePreference(story: StoryDefinition): readonly [string, (locale: string) => void] {
  const [locale, setLocaleState] = useState(() =>
    resolveLocale(story, {
      search: window.location.search,
      stored: readStored(),
      preferred: typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]),
    }),
  )

  const setLocale = (next: string) => {
    if (!Object.hasOwn(story.locales, next)) return
    setLocaleState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
    const url = new URL(window.location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', next)
      window.history.replaceState(null, '', url)
    }
  }

  return [locale, setLocale] as const
}

function readStored(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
