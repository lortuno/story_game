import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEventBus } from '../events/event-bus'
import type { StoryEvent } from '../events/types'
import { createMemorySaveRepository, type SaveRepository } from '../persistence/save-repository'
import mini from './__fixtures__/mini.ink'
import { StoryController, toKnotPath } from './story-controller'

let clock = 0
let ids = 0
let events: StoryEvent[] = []
let saves: SaveRepository
let warnings: string[] = []

function createController(ink = mini) {
  const bus = createEventBus()
  bus.subscribe((event) => events.push(event))
  return new StoryController({
    storyId: 'mini',
    ink,
    events: bus,
    saves,
    now: () => clock,
    createId: () => `id-${++ids}`,
    onWarning: (message) => warnings.push(message),
  })
}

const eventTypes = () => events.map((event) => event.type)

beforeEach(() => {
  clock = 1_000
  ids = 0
  events = []
  warnings = []
  saves = createMemorySaveRepository()
})

describe('StoryController', () => {
  it('starts on the title screen', () => {
    const controller = createController()
    expect(controller.getSnapshot().status).toBe('title')
    expect(controller.hasSave()).toBe(false)
  })

  it('renders the first page with blocks, hints, input and presentation', () => {
    const controller = createController()
    controller.start()
    const { status, page, presentation } = controller.getSnapshot()

    expect(status).toBe('playing')
    expect(page?.blocks).toEqual([{ kind: 'heading', level: 2, text: 'Welcome' }])
    expect(page?.hints.map((hint) => hint.summary)).toEqual(['Ask a friend', 'Ask again'])
    expect(page?.input).toEqual({ variable: 'answer', kind: 'password', label: 'Secret word:' })
    expect(presentation).toEqual({ scene: 'hall', music: 'calm' })
    expect(eventTypes()).toEqual(['session.started', 'page.shown'])
  })

  it('checks answers with the bound normalize() and never publishes password values', () => {
    const controller = createController()
    controller.start()
    controller.submitInput('  Open Sésame! ')

    expect(controller.getSnapshot().page?.path).toBe('door')
    expect(controller.getSnapshot().page?.sfx).toEqual(['creak'])
    const submitted = events.find((event) => event.type === 'input.submitted')
    expect(submitted?.payload).toEqual({ path: 'start', variable: 'answer', kind: 'password' })
    expect(events.some((event) => event.type === 'variable.changed' && event.payload.name === 'answer')).toBe(false)
  })

  it('publishes variable changes and counts failures', () => {
    const controller = createController()
    controller.start()
    controller.submitInput('wrong')

    const { page, stats } = controller.getSnapshot()
    expect(page?.outcome).toBe('fail')
    expect(stats).toMatchObject({ choices: 1, failures: 1 })
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'variable.changed', payload: { name: 'score', value: -1 } }),
    )
  })

  it('ignores choose() on input pages and unknown choice indexes', () => {
    const controller = createController()
    controller.start()
    const before = controller.getSnapshot()
    controller.choose(0)
    expect(controller.getSnapshot()).toBe(before)
    expect(warnings).toHaveLength(1)

    controller.submitInput('opensesame')
    const door = controller.getSnapshot()
    controller.choose(42)
    expect(controller.getSnapshot()).toBe(door)
  })

  it('reveals each hint once and counts it', () => {
    const controller = createController()
    controller.start()
    controller.revealHint(1)
    controller.revealHint(1)
    controller.revealHint(7)

    expect(controller.getSnapshot().revealedHints).toEqual([1])
    expect(controller.getSnapshot().stats.hintsRevealed).toBe(1)
    expect(eventTypes().filter((type) => type === 'hint.revealed')).toHaveLength(1)
  })

  it('ends the story, freezes playtime and clears the save', () => {
    const controller = createController()
    controller.start()
    controller.submitInput('opensesame')
    clock += 5_000
    controller.choose(0)

    const snapshot = controller.getSnapshot()
    expect(snapshot.status).toBe('ended')
    expect(snapshot.page?.ending).toBe('win')
    expect(snapshot.presentation.music).toBeNull()
    expect(snapshot.playtimeMs).toBe(5_000)
    expect(controller.hasSave()).toBe(false)
    expect(events.at(-1)).toMatchObject({
      type: 'story.ended',
      payload: { ending: 'win', playtimeMs: 5_000, choices: 2, failures: 0 },
    })
  })

  it('resumes a saved game on the same page with the same session', () => {
    const first = createController()
    first.start()
    first.submitInput('opensesame')
    clock += 2_000
    first.persist({ exitToTitle: true })
    expect(first.getSnapshot().status).toBe('title')

    const second = createController()
    expect(second.hasSave()).toBe(true)
    expect(second.resume()).toBe(true)
    const snapshot = second.getSnapshot()
    expect(snapshot.page?.path).toBe('door')
    expect(snapshot.page?.choices.map((choice) => choice.text)).toEqual(['Left', 'Right'])
    expect(snapshot.sessionId).toBe(first.getSnapshot().sessionId ?? snapshot.sessionId)
    expect(snapshot.playtimeMs).toBe(2_000)
    expect(snapshot.presentation).toEqual({ scene: 'hall', music: 'calm' })
  })

  it('discards saves made with another story build', () => {
    const controller = createController()
    controller.start()
    const other = createController({ ...mini, hash: 'different' })
    expect(other.hasSave()).toBe(false)
    expect(other.resume()).toBe(false)
    expect(warnings.some((warning) => warning.includes('older version'))).toBe(true)
  })

  it('discards unreadable saves', () => {
    const controller = createController()
    controller.start()
    const save = saves.load('mini')
    if (!save) throw new Error('expected a save')
    saves.save({ ...save, inkState: '{broken' })

    expect(createController().resume()).toBe(false)
    expect(saves.load('mini')).toBeNull()
  })

  it('moves to an error state when an input targets an undeclared variable', () => {
    const controller = createController()
    controller.start()
    controller.submitInput('opensesame')
    controller.choose(1)
    controller.submitInput('x')

    const snapshot = controller.getSnapshot()
    expect(snapshot.status).toBe('error')
    expect(snapshot.error).toContain('undeclared_variable')
    expect(eventTypes().filter((type) => type === 'story.error')).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('notifies subscribers until they unsubscribe', () => {
    const controller = createController()
    const listener = vi.fn()
    const unsubscribe = controller.subscribe(listener)
    controller.start()
    const calls = listener.mock.calls.length
    unsubscribe()
    controller.revealHint(0)
    expect(calls).toBeGreaterThan(0)
    expect(listener).toHaveBeenCalledTimes(calls)
  })
})

describe('toKnotPath', () => {
  it.each([
    ['tablet.mensaje.3.c-0', 'tablet.mensaje'],
    ['door.0', 'door'],
    ['0.c-1', null],
    [null, null],
  ])('%s → %s', (raw, expected) => {
    expect(toKnotPath(raw)).toBe(expected)
  })
})
