/**
 * Framework-agnostic game loop around the ink runtime.
 *
 * - Produces immutable `StorySnapshot`s (React reads them with useSyncExternalStore).
 * - Autosaves the ink state at the *start* of every page, so resuming replays the page
 *   deterministically (ink's RNG seed lives in its state).
 * - Publishes story events (decisions, progress) for current and future consumers.
 */
import { Story } from 'inkjs'
import type { EventBus } from '../events/event-bus'
import type { StoryEventPayloads, StoryEventType } from '../events/types'
import { createMemorySaveRepository, SAVE_VERSION, type SaveGame, type SaveRepository } from '../persistence/save-repository'
import { createId } from './ids'
import { normalizeAnswer } from './normalize'
import { buildPageContent, type RawLine } from './page-builder'
import type { ChoiceView, Page, PlayStats, Presentation, StorySnapshot } from './types'

export interface CompiledInk {
  readonly json: string
  readonly hash: string
}

export interface StoryControllerOptions {
  readonly storyId: string
  readonly ink: CompiledInk
  readonly events?: EventBus
  readonly saves?: SaveRepository
  readonly now?: () => number
  readonly createId?: () => string
  readonly onWarning?: (message: string) => void
}

export const MAX_INPUT_LENGTH = 200
const INK_WARNING = 1 // inkjs ErrorType.Warning

const INITIAL_PRESENTATION: Presentation = { scene: null, music: null }
const INITIAL_STATS: PlayStats = { choices: 0, hintsRevealed: 0, failures: 0 }
const TITLE_SNAPSHOT: StorySnapshot = {
  status: 'title',
  sessionId: null,
  page: null,
  presentation: INITIAL_PRESENTATION,
  revealedHints: [],
  stats: INITIAL_STATS,
  playtimeMs: 0,
  resumedAt: null,
  error: null,
}

export class StoryController {
  private readonly story: Story
  private readonly storyId: string
  private readonly storyHash: string
  private readonly events: EventBus | null
  private readonly saves: SaveRepository
  private readonly now: () => number
  private readonly newId: () => string
  private readonly warn: (message: string) => void
  private readonly listeners = new Set<() => void>()
  /** Variables fed by # input; excluded from variable.changed (password values must not leak). */
  private readonly inputVariables = new Set<string>()
  private snapshot: StorySnapshot = TITLE_SNAPSHOT
  private lastSave: SaveGame | null = null
  private observedVariablesState: unknown = null
  private pageCounter = 0
  private eventSeq = 0

  constructor(options: StoryControllerOptions) {
    this.storyId = options.storyId
    this.storyHash = options.ink.hash
    this.events = options.events ?? null
    this.saves = options.saves ?? createMemorySaveRepository()
    this.now = options.now ?? Date.now
    this.newId = options.createId ?? createId
    this.warn = options.onWarning ?? ((message) => console.warn(`[story:${options.storyId}] ${message}`))

    this.story = new Story(options.ink.json)
    this.story.allowExternalFunctionFallbacks = true
    this.story.BindExternalFunction('normalize', normalizeAnswer, true)
    this.story.onError = (message, type) => {
      if (type === INK_WARNING) this.warn(message)
      else this.fail(new Error(message))
    }
  }

  // ---- store protocol (stable references for useSyncExternalStore) ----

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = (): StorySnapshot => this.snapshot

  // ---- commands ----

  /** Pure check (safe during render); stale saves are discarded by resume(). */
  hasSave(): boolean {
    return this.saves.load(this.storyId)?.storyHash === this.storyHash
  }

  start(): void {
    this.saves.clear(this.storyId)
    this.lastSave = null
    this.story.ResetState()
    this.setSnapshot({ ...TITLE_SNAPSHOT, status: 'playing', sessionId: this.newId(), resumedAt: this.now() })
    this.emit('session.started', { resumed: false, storyHash: this.storyHash })
    this.showNextPage()
  }

  /** Continues the saved playthrough. Returns false when there is no usable save. */
  resume(): boolean {
    const save = this.loadCompatibleSave()
    if (!save) return false
    try {
      this.story.state.LoadJson(save.inkState)
    } catch (error) {
      this.warn(`Discarding unreadable save: ${errorMessage(error)}`)
      this.saves.clear(this.storyId)
      return false
    }
    this.lastSave = save
    this.setSnapshot({
      ...TITLE_SNAPSHOT,
      status: 'playing',
      sessionId: save.sessionId,
      presentation: save.presentation,
      stats: save.stats,
      playtimeMs: save.playtimeMs,
      resumedAt: this.now(),
    })
    this.emit('session.started', { resumed: true, storyHash: this.storyHash })
    this.showNextPage()
    return true
  }

  choose(index: number): void {
    const page = this.activePage()
    if (!page) return
    if (page.input) {
      this.warn('This page expects an answer; use submitInput()')
      return
    }
    const choice = page.choices.find((candidate) => candidate.index === index)
    if (choice) this.pick(page, choice)
  }

  submitInput(value: string): void {
    const page = this.activePage()
    const input = page?.input
    const choice = page?.choices[0]
    if (!page || !input || !choice) return

    if (!this.story.variablesState.GlobalVariableExistsWithName(input.variable)) {
      this.fail(new Error(`# input variable "${input.variable}" is not declared with VAR`))
      return
    }
    const answer = value.trim().slice(0, MAX_INPUT_LENGTH)
    this.story.variablesState.$(input.variable, answer)
    this.emit('input.submitted', {
      path: page.path,
      variable: input.variable,
      kind: input.kind,
      ...(input.kind === 'password' ? {} : { value: answer }),
    })
    this.pick(page, choice)
  }

  revealHint(index: number): void {
    const page = this.activePage()
    const hint = page?.hints[index]
    if (!page || !hint || this.snapshot.revealedHints.includes(index)) return
    this.setSnapshot({
      ...this.snapshot,
      revealedHints: [...this.snapshot.revealedHints, index],
      stats: { ...this.snapshot.stats, hintsRevealed: this.snapshot.stats.hintsRevealed + 1 },
    })
    this.emit('hint.revealed', { path: page.path, index, summary: hint.summary })
  }

  /** Stores the current playtime (call on page hide) and optionally returns to the title screen. */
  persist({ exitToTitle = false }: { exitToTitle?: boolean } = {}): void {
    if (this.snapshot.status !== 'playing') {
      if (exitToTitle) this.setSnapshot(TITLE_SNAPSHOT)
      return
    }
    if (this.lastSave) {
      this.lastSave = { ...this.lastSave, playtimeMs: this.livePlaytime(), savedAt: new Date(this.now()).toISOString() }
      this.saves.save(this.lastSave)
    }
    if (exitToTitle) this.setSnapshot(TITLE_SNAPSHOT)
  }

  // ---- internals ----

  private pick(page: Page, choice: ChoiceView): void {
    this.emit('choice.made', { path: page.path, index: choice.index, text: choice.text })
    try {
      this.story.ChooseChoiceIndex(choice.index)
    } catch (error) {
      this.fail(error)
      return
    }
    this.setSnapshot({ ...this.snapshot, stats: { ...this.snapshot.stats, choices: this.snapshot.stats.choices + 1 } })
    this.showNextPage()
  }

  private showNextPage(): void {
    this.observeVariables()
    const pageStartState = this.story.state.toJson()
    const presentationBefore = this.snapshot.presentation
    const statsBefore = this.snapshot.stats

    const lines: RawLine[] = []
    let path: string | null = null
    try {
      while (this.story.canContinue && this.snapshot.status !== 'error') {
        const text = this.story.Continue() ?? ''
        lines.push({ text, tags: this.story.currentTags ?? [] })
        // Right after a choice ink still points at the choice's origin; the first
        // line actually output tells us where the page really is.
        path ??= toKnotPath(this.story.state.previousPathString)
      }
    } catch (error) {
      this.fail(error)
      return
    }
    if (this.snapshot.status === 'error') return // reported through story.onError

    const { content, presentation, warnings } = buildPageContent(lines, presentationBefore)
    for (const warning of warnings) this.warn(`${path ?? '?'}: ${warning}`)

    const choices = this.story.currentChoices.map((choice) => ({ index: choice.index, text: choice.text }))
    if (content.input) {
      this.inputVariables.add(content.input.variable)
      if (choices.length !== 1) this.warn(`${path ?? '?'}: a page with # input must offer exactly one choice`)
    }

    const page: Page = { id: ++this.pageCounter, path, ...content, choices }
    const stats = { ...statsBefore, failures: statsBefore.failures + (content.outcome === 'fail' ? 1 : 0) }
    const ended = choices.length === 0

    if (ended) {
      this.finish(page, presentation, stats)
      return
    }

    this.setSnapshot({ ...this.snapshot, page, presentation, stats, revealedHints: [] })
    this.writeSave(pageStartState, presentationBefore, statsBefore)
    this.emit('page.shown', { pageId: page.id, path, outcome: page.outcome, choiceCount: choices.length })
  }

  private finish(page: Page, presentation: Presentation, stats: PlayStats): void {
    const playtimeMs = this.livePlaytime()
    this.setSnapshot({ ...this.snapshot, status: 'ended', page, presentation, stats, revealedHints: [], playtimeMs, resumedAt: null })
    this.saves.clear(this.storyId)
    this.lastSave = null
    this.emit('page.shown', { pageId: page.id, path: page.path, outcome: page.outcome, choiceCount: 0 })
    this.emit('story.ended', { ending: page.ending ?? 'end', playtimeMs, ...stats })
  }

  private writeSave(inkState: string, presentation: Presentation, stats: PlayStats): void {
    const sessionId = this.snapshot.sessionId
    if (!sessionId) return
    this.lastSave = {
      version: SAVE_VERSION,
      storyId: this.storyId,
      storyHash: this.storyHash,
      sessionId,
      inkState,
      presentation,
      stats,
      playtimeMs: this.livePlaytime(),
      savedAt: new Date(this.now()).toISOString(),
    }
    this.saves.save(this.lastSave)
  }

  private loadCompatibleSave(): SaveGame | null {
    const save = this.saves.load(this.storyId)
    if (!save) return null
    if (save.storyHash !== this.storyHash) {
      this.warn('Saved game belongs to an older version of this story; discarding it')
      this.saves.clear(this.storyId)
      return null
    }
    return save
  }

  /** ink replaces its variables state on ResetState, so (re)attach the observer when it changes. */
  private observeVariables(): void {
    const variablesState = this.story.variablesState
    if (variablesState === this.observedVariablesState) return
    this.observedVariablesState = variablesState
    variablesState.variableChangedEventCallbacks.push((name) => {
      if (this.inputVariables.has(name)) return
      this.emit('variable.changed', { name, value: toEventValue(this.story.variablesState.$(name)) })
    })
  }

  private activePage(): Page | null {
    return this.snapshot.status === 'playing' ? this.snapshot.page : null
  }

  private livePlaytime(): number {
    const { playtimeMs, resumedAt } = this.snapshot
    return resumedAt === null ? playtimeMs : playtimeMs + Math.max(0, this.now() - resumedAt)
  }

  private fail(error: unknown): void {
    if (this.snapshot.status === 'error') return // one incident, one event (ink may report several errors)
    const message = errorMessage(error)
    console.error(`[story:${this.storyId}]`, error)
    this.setSnapshot({ ...this.snapshot, status: 'error', error: message, resumedAt: null })
    this.emit('story.error', { message })
  }

  private emit<K extends StoryEventType>(type: K, payload: StoryEventPayloads[K]): void {
    const sessionId = this.snapshot.sessionId
    if (!this.events || !sessionId) return
    this.events.publish({
      id: this.newId(),
      type,
      storyId: this.storyId,
      sessionId,
      seq: ++this.eventSeq,
      at: new Date(this.now()).toISOString(),
      payload,
    } as never) // the mapped union can't be narrowed from a generic K; payload is type-checked above
  }

  private setSnapshot(next: StorySnapshot): void {
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}

/** "tablet.mensaje.3.c-0" → "tablet.mensaje": drop ink's internal index/choice segments. */
export function toKnotPath(raw: string | null): string | null {
  if (!raw) return null
  const named: string[] = []
  for (const segment of raw.split('.')) {
    if (!/^[A-Za-z_]\w*$/.test(segment)) break
    named.push(segment)
  }
  return named.length > 0 ? named.join('.') : null
}

function toEventValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return String(value) // ink lists and divert targets
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
