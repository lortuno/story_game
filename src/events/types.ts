/**
 * Story events: the contract for sharing decisions and progress outside the browser
 * (analytics, multiplayer, backend sync). Adding an event = adding a key here.
 * Keep payloads small, JSON-serialisable and free of secrets (password inputs never
 * carry their value).
 */
export interface StoryEventPayloads {
  'session.started': { readonly resumed: boolean; readonly storyHash: string }
  'page.shown': {
    readonly pageId: number
    readonly path: string | null
    readonly outcome: string | null
    readonly choiceCount: number
  }
  'choice.made': { readonly path: string | null; readonly index: number; readonly text: string }
  'input.submitted': {
    readonly path: string | null
    readonly variable: string
    readonly kind: string
    /** Omitted for password inputs. */
    readonly value?: string
  }
  'hint.revealed': { readonly path: string | null; readonly index: number; readonly summary: string }
  'variable.changed': { readonly name: string; readonly value: string | number | boolean | null }
  'story.ended': {
    readonly ending: string
    readonly playtimeMs: number
    readonly choices: number
    readonly hintsRevealed: number
    readonly failures: number
  }
  'story.error': { readonly message: string }
}

export type StoryEventType = keyof StoryEventPayloads

export interface StoryEventEnvelope<K extends StoryEventType = StoryEventType> {
  /** Unique id, usable as an idempotency key by a backend. */
  readonly id: string
  readonly type: K
  readonly storyId: string
  /** One playthrough; survives reloads via the save game. */
  readonly sessionId: string
  /** Monotonic per page load, for ordering within a batch. */
  readonly seq: number
  /** ISO-8601 timestamp. */
  readonly at: string
  readonly payload: StoryEventPayloads[K]
}

export type StoryEvent = { [K in StoryEventType]: StoryEventEnvelope<K> }[StoryEventType]

export type StoryEventListener = (event: StoryEvent) => void
