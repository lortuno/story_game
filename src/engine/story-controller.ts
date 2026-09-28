/**
 * Framework-agnostic game loop around the Yarn Spinner runtime.
 *
 * - Produces immutable `StorySnapshot`s (React reads them with useSyncExternalStore).
 * - A page is everything Yarn delivers up to the next option set.
 * - Saves are the list of decisions so far; resuming replays them on a fresh Dialogue
 *   (Yarn has no state snapshot; the story must stay deterministic, i.e. avoid random()).
 * - Publishes story events (decisions, progress) for current and future consumers.
 */
import { Dialogue, Library, type DialogueEvent } from 'yarnspinner-typescript'
import type { EventBus } from '../events/event-bus'
import type { StoryEventPayloads, StoryEventType } from '../events/types'
import {
  createMemorySaveRepository,
  MAX_SAVE_STEPS,
  SAVE_VERSION,
  type SaveGame,
  type SaveRepository,
  type SaveStep,
} from '../persistence/save-repository'
import { parseCommand } from './commands'
import { createId } from './ids'
import { styledFromYarn } from './markup'
import { normalizeAnswer } from './normalize'
import { buildPageContent, type StoryItem } from './page-builder'
import type { ChoiceView, InputRequest, Page, PlayStats, Presentation, StorySnapshot } from './types'

export interface CompiledDialogue {
  /** Compiled Yarn program as JSON (from tooling/yarn). */
  readonly json: string
  readonly hash: string
}

export interface StoryControllerOptions {
  readonly storyId: string
  readonly dialogue: CompiledDialogue
  /** Yarn node the story starts at. */
  readonly startNode: string
  /** Language of this dialogue, reported in session events. */
  readonly locale?: string
  /** Storage slot for saves; defaults to storyId. Use one per language (saves don't replay across languages). */
  readonly saveSlot?: string
  readonly events?: EventBus
  readonly saves?: SaveRepository
  readonly now?: () => number
  readonly createId?: () => string
  readonly onWarning?: (message: string) => void
}

export const MAX_INPUT_LENGTH = 200
/** Upper bound on runtime events per page, so a broken script can't hang the tab. */
const MAX_EVENTS_PER_PAGE = 10_000
const INTERNAL_VARIABLE = /^Yarn\.Internal\./
const YARN_INTERNAL_TAG = /^(line:|lastline$)/

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

/** Raw output of the runtime for one page, before it becomes blocks. */
interface RawPage {
  readonly path: string | null
  readonly items: readonly StoryItem[]
  readonly choices: readonly ChoiceView[]
  readonly ended: boolean
}

type EventResult = 'content' | { readonly choices: readonly ChoiceView[]; readonly ended: boolean } | null

export class StoryController {
  private readonly storyId: string
  private readonly saveSlot: string
  private readonly locale: string | null
  private readonly storyHash: string
  private readonly programJson: string
  private readonly startNode: string
  private readonly events: EventBus | null
  private readonly saves: SaveRepository
  private readonly now: () => number
  private readonly newId: () => string
  private readonly warn: (message: string) => void
  private readonly listeners = new Set<() => void>()
  /** Variables fed by #input; excluded from variable.changed (password values must not leak). */
  private readonly inputVariables = new Set<string>()
  private dialogue: Dialogue | null = null
  private currentNode: string | null = null
  private steps: readonly SaveStep[] = []
  private knownVariables: Readonly<Record<string, unknown>> = {}
  /** The page shown right after a resume was already reported in the earlier session. */
  private replayingCurrentPage = false
  private snapshot: StorySnapshot = TITLE_SNAPSHOT
  private lastSave: SaveGame | null = null
  private pageCounter = 0
  private eventSeq = 0

  constructor(options: StoryControllerOptions) {
    this.storyId = options.storyId
    this.saveSlot = options.saveSlot ?? options.storyId
    this.locale = options.locale ?? null
    this.storyHash = options.dialogue.hash
    this.programJson = options.dialogue.json
    this.startNode = options.startNode
    this.events = options.events ?? null
    this.saves = options.saves ?? createMemorySaveRepository()
    this.now = options.now ?? Date.now
    this.newId = options.createId ?? createId
    this.warn = options.onWarning ?? ((message) => console.warn(`[story:${options.storyId}] ${message}`))
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
    return this.saves.load(this.saveSlot)?.storyHash === this.storyHash
  }

  start(): void {
    this.saves.clear(this.saveSlot)
    this.lastSave = null
    this.setSnapshot({ ...TITLE_SNAPSHOT, status: 'playing', sessionId: this.newId(), resumedAt: this.now() })
    try {
      this.resetDialogue()
    } catch (error) {
      this.fail(error)
      return
    }
    this.emit('session.started', { resumed: false, storyHash: this.storyHash, locale: this.locale })
    this.showNextPage()
  }

  /** Continues the saved playthrough. Returns false when there is no usable save. */
  resume(): boolean {
    const save = this.loadCompatibleSave()
    if (!save) return false

    let presentation: Presentation
    try {
      presentation = this.replay(save.steps)
    } catch (error) {
      this.warn(`Discarding a save that no longer replays: ${errorMessage(error)}`)
      this.saves.clear(this.saveSlot)
      return false
    }

    this.lastSave = save
    this.replayingCurrentPage = true
    this.setSnapshot({
      ...TITLE_SNAPSHOT,
      status: 'playing',
      sessionId: save.sessionId,
      presentation,
      stats: save.stats,
      playtimeMs: save.playtimeMs,
      resumedAt: this.now(),
    })
    this.emit('session.started', { resumed: true, storyHash: this.storyHash, locale: this.locale })
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
    if (choice) this.pick(page, choice, { kind: 'choice', index: choice.index })
  }

  submitInput(value: string): void {
    const page = this.activePage()
    const input = page?.input
    const choice = page?.choices[0]
    if (!page || !input || !choice || !this.dialogue) return

    if (this.dialogue.getVariable(input.variable) === undefined) {
      this.fail(new Error(`#input variable "$${input.variable}" is not declared with <<declare>>`))
      return
    }
    const answer = value.trim().slice(0, MAX_INPUT_LENGTH)
    if (!isValidAnswer(input, answer)) {
      this.warn(`Rejected answer for "${input.variable}": expected ${input.length} digits`)
      return
    }
    this.dialogue.setVariable(input.variable, answer)
    this.emit('input.submitted', {
      path: page.path,
      variable: input.variable,
      kind: input.kind,
      ...(input.kind === 'password' ? {} : { value: answer }),
    })
    this.pick(page, choice, { kind: 'input', value: answer })
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
    if (this.snapshot.status === 'playing' && this.lastSave) {
      this.lastSave = { ...this.lastSave, playtimeMs: this.livePlaytime(), savedAt: new Date(this.now()).toISOString() }
      this.saves.save(this.lastSave)
    }
    if (exitToTitle) this.setSnapshot(TITLE_SNAPSHOT)
  }

  // ---- runtime ----

  private resetDialogue(): void {
    const library = new Library()
    library.registerFunction('normalize', normalizeAnswer)
    // Parse per session: playthroughs must never share mutable program state.
    this.dialogue = new Dialogue(JSON.parse(this.programJson), {
      startAt: this.startNode,
      library,
      logError: (message) => this.warn(message),
    })
    if (!this.dialogue.nodeExists(this.startNode)) throw new Error(`Start node "${this.startNode}" does not exist`)
    this.currentNode = null
    this.steps = []
    this.knownVariables = this.dialogue.getVariables()
  }

  /** Runs the dialogue up to the next option set (or the end). */
  private readPage(): RawPage {
    const dialogue = this.requireDialogue()
    const items: StoryItem[] = []
    let path: string | null = null
    let seen = 0

    while (seen < MAX_EVENTS_PER_PAGE) {
      const batch = dialogue.continue()
      if (batch.length === 0) throw new Error('The dialogue stopped without options or an end')
      for (const event of batch) {
        seen++
        const result = this.readEvent(event, items)
        if (result === 'content') path ??= this.currentNode
        else if (result !== null) return { path: path ?? this.currentNode, items, ...result }
      }
    }
    throw new Error(`No option set within ${MAX_EVENTS_PER_PAGE} events (infinite loop in the script?)`)
  }

  private readEvent(event: DialogueEvent, items: StoryItem[]): EventResult {
    switch (event.type) {
      case 'nodeStart':
        this.currentNode = event.nodeName
        return null
      case 'line':
        items.push({
          kind: 'line',
          text: styledFromYarn(event.text, event.markup?.attributes, (message) => this.warn(`${this.currentNode}: ${message}`)),
          speaker: event.speaker ?? null,
          tags: (event.tags ?? []).filter((tag) => !YARN_INTERNAL_TAG.test(tag)),
        })
        return 'content'
      case 'command':
        items.push({ kind: 'command', ...parseCommand(event.command) })
        return 'content'
      case 'options': {
        const choices = event.options.filter((option) => option.isAvailable).map(({ index, text }) => ({ index, text }))
        if (choices.length === 0) throw new Error(`No available options in node "${this.currentNode}"`)
        return { choices, ended: false }
      }
      case 'dialogueComplete':
        return { choices: [], ended: true }
      default:
        return null
    }
  }

  /** Re-runs saved decisions silently; returns the presentation at the current page. */
  private replay(steps: readonly SaveStep[]): Presentation {
    this.resetDialogue()
    const dialogue = this.requireDialogue()
    let presentation = INITIAL_PRESENTATION
    for (const step of steps) {
      const raw = this.readPage()
      if (raw.ended) throw new Error('the story ended earlier than the saved game')
      const { content, presentation: next } = buildPageContent(raw.items, presentation)
      presentation = next
      if (step.kind === 'input') {
        if (!content.input) throw new Error(`expected an answer field on "${raw.path}"`)
        dialogue.setVariable(content.input.variable, step.value)
        dialogue.selectOption(raw.choices[0].index)
      } else {
        if (!raw.choices.some((choice) => choice.index === step.index)) throw new Error(`option ${step.index} is gone`)
        dialogue.selectOption(step.index)
      }
    }
    this.steps = steps
    this.knownVariables = dialogue.getVariables()
    return presentation
  }

  // ---- internals ----

  private pick(page: Page, choice: ChoiceView, step: SaveStep): void {
    this.emit('choice.made', { path: page.path, index: choice.index, text: choice.text })
    try {
      this.requireDialogue().selectOption(choice.index)
    } catch (error) {
      this.fail(error)
      return
    }
    this.steps = [...this.steps, step].slice(-MAX_SAVE_STEPS)
    this.setSnapshot({ ...this.snapshot, stats: { ...this.snapshot.stats, choices: this.snapshot.stats.choices + 1 } })
    this.showNextPage()
  }

  private showNextPage(): void {
    const presentationBefore = this.snapshot.presentation
    const statsBefore = this.snapshot.stats

    let raw: RawPage
    try {
      raw = this.readPage()
    } catch (error) {
      this.fail(error)
      return
    }

    const { content, presentation, warnings } = buildPageContent(raw.items, presentationBefore)
    for (const warning of warnings) this.warn(`${raw.path ?? '?'}: ${warning}`)
    if (content.input) {
      this.inputVariables.add(content.input.variable)
      if (raw.choices.length !== 1) this.warn(`${raw.path ?? '?'}: a page with #input must offer exactly one option`)
    }
    this.publishVariableChanges()

    const page: Page = { id: ++this.pageCounter, path: raw.path, ...content, choices: raw.choices }
    const stats = { ...statsBefore, failures: statsBefore.failures + (content.outcome === 'fail' ? 1 : 0) }

    if (raw.ended) {
      this.finish(page, presentation, stats)
      return
    }
    this.setSnapshot({ ...this.snapshot, page, presentation, stats, revealedHints: [] })
    this.writeSave(statsBefore)
    this.emit('page.shown', { pageId: page.id, path: page.path, outcome: page.outcome, choiceCount: page.choices.length })
  }

  private finish(page: Page, presentation: Presentation, stats: PlayStats): void {
    const playtimeMs = this.livePlaytime()
    this.setSnapshot({ ...this.snapshot, status: 'ended', page, presentation, stats, revealedHints: [], playtimeMs, resumedAt: null })
    this.saves.clear(this.saveSlot)
    this.lastSave = null
    this.emit('page.shown', { pageId: page.id, path: page.path, outcome: page.outcome, choiceCount: 0 })
    this.emit('story.ended', { ending: page.ending ?? 'end', playtimeMs, ...stats })
  }

  private publishVariableChanges(): void {
    const previous = this.knownVariables
    const current = this.requireDialogue().getVariables()
    this.knownVariables = current
    if (this.replayingCurrentPage) {
      this.replayingCurrentPage = false
      return
    }
    for (const [name, value] of Object.entries(current)) {
      if (INTERNAL_VARIABLE.test(name) || this.inputVariables.has(name) || Object.is(previous[name], value)) continue
      this.emit('variable.changed', { name, value: toEventValue(value) })
    }
  }

  /** Stats are saved as they were at the start of the page, since resuming replays it. */
  private writeSave(stats: PlayStats): void {
    const sessionId = this.snapshot.sessionId
    if (!sessionId) return
    this.lastSave = {
      version: SAVE_VERSION,
      storyId: this.saveSlot,
      storyHash: this.storyHash,
      sessionId,
      steps: this.steps,
      stats,
      playtimeMs: this.livePlaytime(),
      savedAt: new Date(this.now()).toISOString(),
    }
    this.saves.save(this.lastSave)
  }

  private loadCompatibleSave(): SaveGame | null {
    const save = this.saves.load(this.saveSlot)
    if (!save) return null
    if (save.storyHash !== this.storyHash) {
      this.warn('Saved game belongs to an older version of this story; discarding it')
      this.saves.clear(this.saveSlot)
      return null
    }
    return save
  }

  private requireDialogue(): Dialogue {
    if (!this.dialogue) throw new Error('The story has not been started')
    return this.dialogue
  }

  private activePage(): Page | null {
    return this.snapshot.status === 'playing' ? this.snapshot.page : null
  }

  private livePlaytime(): number {
    const { playtimeMs, resumedAt } = this.snapshot
    return resumedAt === null ? playtimeMs : playtimeMs + Math.max(0, this.now() - resumedAt)
  }

  private fail(error: unknown): void {
    if (this.snapshot.status === 'error') return // one incident, one event
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

/** Keypad answers must be exactly `length` digits; other kinds accept any text. */
function isValidAnswer(input: InputRequest, answer: string): boolean {
  if (input.kind !== 'keypad') return true
  return answer.length === input.length && /^[0-9]+$/.test(answer)
}

function toEventValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return value === undefined ? null : String(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
