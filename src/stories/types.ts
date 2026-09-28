import type { CompiledInk } from '../engine/story-controller'

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
  /** BCP-47 language of the story text; also selects UI strings. */
  readonly lang: string
  readonly credits: string
  /** Soft target shown next to the play clock (not enforced). */
  readonly timeLimitMinutes: number | null
  /** Image key shown on the title screen. */
  readonly cover: string | null
}

export interface StoryDefinition {
  readonly id: string
  readonly meta: StoryMeta
  readonly ink: CompiledInk
  readonly images: Readonly<Record<string, StoryImage>>
  readonly audio: AudioLibrary
  /** Link keys used by `[label](key)` in ink → https URLs. Only these URLs can be opened. */
  readonly links: Readonly<Record<string, string>>
}
