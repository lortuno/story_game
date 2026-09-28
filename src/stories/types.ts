import type { CompiledDialogue } from '../engine/story-controller'

export interface StoryImage {
  readonly src: string
  readonly width: number
  readonly height: number
}

/** Audio keys → asset URLs. Files are only downloaded when first played. */
export interface AudioLibrary {
  readonly music: Readonly<Record<string, string>>
  readonly sfx: Readonly<Record<string, string>>
}

export interface StoryMeta {
  readonly title: string
  readonly tagline: string
  readonly description: string
  /** BCP-47 language of the story text (e.g. "es", "en-GB"); selects UI strings and date format. */
  readonly lang: string
  readonly credits: string
  /** In-world date of the story (ISO yyyy-mm-dd), shown before the play clock. */
  readonly date: string | null
  /** Soft target shown next to the play clock (not enforced). */
  readonly timeLimitMinutes: number | null
  /** Image key shown on the title screen. */
  readonly cover: string | null
}

/** Everything that changes with the language. */
export interface StoryContent {
  readonly meta: StoryMeta
  /** Compiled Yarn Spinner project (import of a .yarnproject file). */
  readonly dialogue: CompiledDialogue
}

export interface StoryDefinition {
  readonly id: string
  /** Locale code → translated content. Codes are short ("es", "en") and appear in `?lang=`. */
  readonly locales: Readonly<Record<string, StoryContent>>
  readonly defaultLocale: string
  /** Yarn node where a new game starts (same in every language). */
  readonly startNode: string
  readonly images: Readonly<Record<string, StoryImage>>
  readonly audio: AudioLibrary
  /** Keys used by `[link key=…]` markup → https URLs. Only these URLs can be opened. */
  readonly links: Readonly<Record<string, string>>
}

/** A story resolved to one language: what the engine and the UI consume. */
export interface LocalizedStory extends Omit<StoryDefinition, 'locales' | 'defaultLocale'>, StoryContent {
  readonly locale: string
  /** All locale codes the story is available in, for the language switch. */
  readonly availableLocales: readonly string[]
}
