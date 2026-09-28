/**
 * Walkthrough of the real story: guarantees every puzzle answer from the original
 * PHP version still works and every command, image and link the Yarn scripts use exists.
 */
import { describe, expect, it } from 'vitest'
import { StoryController } from '../../engine/story-controller'
import { createMemorySaveRepository, type SaveRepository } from '../../persistence/save-repository'
import type { Page, StyledText } from '../../engine/types'
import story from './index'

function play(saves: SaveRepository = createMemorySaveRepository()) {
  const warnings: string[] = []
  const pages: Page[] = []
  const controller = new StoryController({
    storyId: story.id,
    dialogue: story.dialogue,
    startNode: story.startNode,
    saves,
    onWarning: (message) => warnings.push(message),
  })
  controller.subscribe(() => {
    const page = controller.getSnapshot().page
    if (page && pages.at(-1) !== page) pages.push(page)
  })
  return { controller, pages, warnings, current: () => controller.getSnapshot() }
}

const WINNING_RUN = ['TenedoR', 3, 1, '0426', 'oscuridad', 'María Luisa González'] as const

function playWinningRun(controller: StoryController): void {
  for (const step of WINNING_RUN) {
    if (typeof step === 'number') controller.choose(step)
    else controller.submitInput(step)
  }
}

function textsOf(page: Page): StyledText[] {
  return [
    ...page.blocks.flatMap((block) => (block.kind === 'group' ? block.items : 'text' in block ? [block.text] : [])),
    ...page.hints.map((hint) => hint.body),
    ...(page.input ? [page.input.label] : []),
  ]
}

describe('escape story', () => {
  it('can be completed with the original answers, without warnings', () => {
    const { controller, pages, warnings, current } = play()
    controller.start()
    expect(current().page?.path).toBe('apartamento')

    controller.submitInput('TenedoR')
    expect(current().page?.path).toBe('tablet')
    controller.choose(3)
    expect(current().page?.path).toBe('chalet')
    controller.choose(1)
    expect(current().page?.path).toBe('sotano')
    controller.submitInput('0426')
    expect(current().page?.path).toBe('cocina')
    controller.submitInput(' Oscuridad ')
    expect(current().page?.path).toBe('oscuridad')
    controller.submitInput('María Luisa González')

    const end = current()
    expect(end.status).toBe('ended')
    expect(end.page?.ending).toBe('victoria')
    expect(end.stats.failures).toBe(0)
    expect(warnings).toEqual([])
    expect(pages).toHaveLength(7)
  })

  it('is case-sensitive for the tablet password, as in the original', () => {
    const { controller, current } = play()
    controller.start()
    controller.submitInput('tenedor')
    expect(current().page?.outcome).toBe('fail')
    controller.choose(0)
    expect(current().page?.path).toBe('tablet_bloqueada')
    expect(current().page?.input?.kind).toBe('password')
  })

  it('uses a 4-digit keypad for the basement lock and rejects anything else', () => {
    const { controller, current, warnings } = play()
    controller.start()
    controller.submitInput('TenedoR')
    controller.choose(3)
    controller.choose(1)
    expect(current().page?.input).toMatchObject({ kind: 'keypad', length: 4 })

    for (const invalid of ['04a6', '042', '04261']) controller.submitInput(invalid)
    expect(current().page?.path).toBe('sotano')
    expect(current().stats.choices).toBe(3)
    expect(warnings).toHaveLength(3)

    controller.submitInput('0426')
    expect(current().page?.path).toBe('cocina')
  })

  it('routes every wrong answer to a retry page that returns to the puzzle', () => {
    const { controller, current } = play()
    controller.start()
    controller.submitInput('TenedoR')
    controller.choose(0) // wrong route
    expect(current().page?.outcome).toBe('fail')
    controller.choose(0)
    expect(current().page?.path).toBe('mensaje')
    controller.choose(3)
    controller.choose(0) // innocent player
    expect(current().page?.outcome).toBe('fail')
    controller.choose(0)
    controller.choose(1)
    controller.submitInput('1234')
    controller.choose(0)
    controller.submitInput('0426')
    controller.submitInput('luz')
    controller.choose(0)
    controller.submitInput('oscuridad')
    controller.submitInput('Pedro Cristóbal')
    expect(current().page?.path).toBe('victima_muerta')
    controller.choose(0)
    controller.submitInput('María Luisa González')

    expect(current().status).toBe('ended')
    expect(current().stats.failures).toBe(5)
    const text = current().page?.blocks.map((block) => ('text' in block ? block.text.text : '')).join(' ')
    expect(text).toContain('5 veces')
  })

  it('resumes a saved game mid-story by replaying the decisions', () => {
    const saves = createMemorySaveRepository()
    const first = play(saves)
    first.controller.start()
    first.controller.submitInput('tenedor') // fail + retry
    first.controller.choose(0)
    first.controller.submitInput('TenedoR')
    first.controller.choose(3)
    first.controller.persist({ exitToTitle: true })

    const second = play(saves)
    expect(second.controller.resume()).toBe(true)
    expect(second.current().page?.path).toBe('chalet')
    expect(second.current().presentation).toEqual({ scene: 'header_police', music: 'tension' })
    expect(second.current().stats).toMatchObject({ choices: 4, failures: 1 })
    second.controller.choose(1)
    expect(second.current().page?.path).toBe('sotano')
    expect(second.warnings).toEqual([])
  })

  it('only references images and links that exist, has no speakers and no raw markup', () => {
    const { controller, pages, current } = play()
    controller.start()
    playWinningRun(controller)

    const scenes = new Set<string>()
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.kind === 'figure') {
          for (const image of block.images) expect(story.images, image.key).toHaveProperty(image.key)
        }
        // A speaker here means a narrative ':' was not escaped as '\:'.
        if (block.kind === 'paragraph') expect(block.speaker, block.text.text).toBeNull()
      }
      for (const text of textsOf(page)) {
        expect(text.text, 'unparsed markup').not.toMatch(/\[\/?[a-z]+[\] ]/i)
        for (const mark of text.marks) {
          if (mark.kind === 'link') expect(story.links, mark.key).toHaveProperty(mark.key)
        }
      }
    }
    scenes.add(current().presentation.scene ?? '')
    for (const scene of scenes) if (scene) expect(story.images).toHaveProperty(scene)
  })
})
