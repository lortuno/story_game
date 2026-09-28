import type { LocalizedStory, StoryDefinition } from './types'

export function localizeStory(story: StoryDefinition, locale: string): LocalizedStory {
  const code = Object.hasOwn(story.locales, locale) ? locale : story.defaultLocale
  const { locales, defaultLocale: _default, ...shared } = story
  return { ...shared, ...locales[code], locale: code, availableLocales: Object.keys(locales) }
}

export interface LocaleSources {
  /** `location.search`, e.g. "?lang=en". */
  readonly search: string
  /** Locale remembered from an earlier visit. */
  readonly stored: string | null
  /** `navigator.languages`, most preferred first. */
  readonly preferred: readonly string[]
}

/** Picks the language: `?lang=` > remembered choice > browser preference > story default. */
export function resolveLocale(story: StoryDefinition, { search, stored, preferred }: LocaleSources): string {
  const available = (code: string | null | undefined): code is string => !!code && Object.hasOwn(story.locales, code)
  const requested = new URLSearchParams(search).get('lang')?.toLowerCase()
  if (available(requested)) return requested
  if (available(stored)) return stored
  const browser = preferred.map((tag) => tag.toLowerCase().split('-')[0]).find(available)
  return browser ?? story.defaultLocale
}
