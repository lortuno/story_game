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
  /** BCP-47 language of the story text; also selects UI strings. */
  readonly lang: string
  readonly credits: string
  /** In-world date of the story (ISO yyyy-mm-dd), shown before the play clock. */
  readonly date: string | null
  /** Soft target shown next to the play clock (not enforced). */
  readonly timeLimitMinutes: number | null
  /** Image key shown on the title screen. */
  readonly cover: string | null
}

export interface StoryDefinition {
  readonly id: string
  readonly meta: StoryMeta
  /** Compiled Yarn Spinner project (import of a .yarnproject file). */
  readonly dialogue: CompiledDialogue
  /** Yarn node where a new game starts. */
  readonly startNode: string
  readonly images: Readonly<Record<string, StoryImage>>
  readonly audio: AudioLibrary
  /** Keys used by `[link key=…]` markup → https URLs. Only these URLs can be opened. */
  readonly links: Readonly<Record<string, string>>
}
