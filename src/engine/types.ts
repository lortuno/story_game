/**
 * View model produced by the engine. Everything here is plain, immutable data:
 * the UI renders it, the event layer can serialise it, and tests can assert on it.
 */

export type GroupStyle = 'postit' | 'list' | 'olist' | 'note' | 'clue'
export type InputKind = 'text' | 'password' | 'code' | 'keypad'

/** A span of formatting over `StyledText.text`, from Yarn markup (`[b]`, `[link key=…]`, `[tip text="…"]`). */
export type Mark =
  | { readonly kind: 'bold'; readonly start: number; readonly end: number }
  | { readonly kind: 'link'; readonly start: number; readonly end: number; readonly key: string }
  | { readonly kind: 'tip'; readonly start: number; readonly end: number; readonly tip: string }

/** Plain text plus formatting marks. Rendered as React nodes, never as HTML. */
export interface StyledText {
  readonly text: string
  readonly marks: readonly Mark[]
}

export interface ImageRef {
  readonly key: string
  readonly caption: string | null
}

export type Block =
  | { readonly kind: 'paragraph'; readonly text: StyledText; readonly speaker: string | null }
  | { readonly kind: 'heading'; readonly level: 2 | 3; readonly text: StyledText }
  | { readonly kind: 'group'; readonly style: GroupStyle; readonly items: readonly StyledText[] }
  | { readonly kind: 'figure'; readonly images: readonly ImageRef[] }

export interface Hint {
  readonly summary: string
  readonly body: StyledText
}

export interface InputRequest {
  /** Yarn variable name without the `$`. */
  readonly variable: string
  readonly kind: InputKind
  readonly label: StyledText
  /** Exact number of characters required (keypad inputs); null = free length. */
  readonly length: number | null
}

export interface ChoiceView {
  /** Option index as delivered by Yarn (unavailable options are hidden, so indexes may skip). */
  readonly index: number
  readonly text: string
}

/** Persistent presentation state: survives page changes until a command changes it. */
export interface Presentation {
  readonly scene: string | null
  readonly music: string | null
}

/** One screen of story: all content up to the next option set. */
export interface Page {
  readonly id: number
  /** Yarn node where the page started, e.g. "keypad". */
  readonly path: string | null
  readonly blocks: readonly Block[]
  readonly hints: readonly Hint[]
  readonly choices: readonly ChoiceView[]
  readonly input: InputRequest | null
  readonly outcome: string | null
  readonly ending: string | null
  /** One-shot sound effects to play when the page is shown. */
  readonly sfx: readonly string[]
}

export interface PlayStats {
  readonly choices: number
  readonly hintsRevealed: number
  readonly failures: number
}

export type StoryStatus = 'title' | 'playing' | 'ended' | 'error'

export interface StorySnapshot {
  readonly status: StoryStatus
  readonly sessionId: string | null
  readonly page: Page | null
  readonly presentation: Presentation
  readonly revealedHints: readonly number[]
  readonly stats: PlayStats
  /** Playtime accumulated before `resumedAt`; live time = playtimeMs + (now - resumedAt). */
  readonly playtimeMs: number
  /** Epoch ms when the clock was (re)started; null when the clock is stopped. */
  readonly resumedAt: number | null
  readonly error: string | null
}
