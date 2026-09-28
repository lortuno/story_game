/**
 * Walkthrough of the real story in every language: guarantees every puzzle answer from the
 * original PHP version still works, every command, image and link the Yarn scripts use exists,
 * and the translations keep the same structure (same nodes, options and jumps).
 */
import { describe, expect, it } from 'vitest'
import { StoryController } from '../../engine/story-controller'
import type { Page, StyledText } from '../../engine/types'
import { createMemorySaveRepository, type SaveRepository } from '../../persistence/save-repository'
import { localizeStory } from '../locale'
import story from './index'

/** The only riddle whose answer is translated: "¿Qué se ve con los ojos cerrados?" */
const WEB_ANSWER: Readonly<Record<string, string>> = { es: 'oscuridad', en: 'darkness' }

function play(locale: string, saves: SaveRepository = createMemorySaveRepository()) {
  const localized = localizeStory(story, locale)
  const warnings: string[] = []
  const pages: Page[] = []
  const controller = new StoryController({
    storyId: story.id,
    dialogue: localized.dialogue,
    startNode: localized.startNode,
    locale,
    saves,
    onWarning: (message) => warnings.push(message),
  })
  controller.subscribe(() => {
    const page = controller.getSnapshot().page
    if (page && pages.at(-1) !== page) pages.push(page)
  })
  return { controller, pages, warnings, current: () => controller.getSnapshot() }
}

function playWinningRun(controller: StoryController, locale: string): void {
  for (const step of ['TenedoR', 3, 1, '0426', WEB_ANSWER[locale], 'María Luisa González'] as const) {
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

const LOCALES = Object.keys(story.locales)

describe.each(LOCALES)('escape story (%s)', (locale) => {
  it('can be completed with the original answers, without warnings', () => {
    const { controller, pages, warnings, current } = play(locale)
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
    controller.submitInput(` ${WEB_ANSWER[locale].toUpperCase()} `)
    expect(current().page?.path).toBe('oscuridad')
    controller.submitInput('María Luisa González')

    const end = current()
    expect(end.status).toBe('ended')
    expect(end.page?.ending).toBe('victoria')
    expect(end.stats.failures).toBe(0)
    expect(warnings).toEqual([])
    expect(pages).toHaveLength(7)
  })

  it('keeps the tablet password untranslated and case-sensitive', () => {
    const { controller, current } = play(locale)
    controller.start()
    controller.submitInput('tenedor')
    expect(current().page?.outcome).toBe('fail')
    controller.choose(0)
    expect(current().page?.path).toBe('tablet_bloqueada')
    expect(current().page?.input?.kind).toBe('password')
  })

  it('only accepts the web answer of its own language', () => {
    const other = LOCALES.find((code) => code !== locale) ?? locale
    const { controller, current } = play(locale)
    controller.start()
    for (const step of ['TenedoR', 3, 1, '0426'] as const) {
      if (typeof step === 'number') controller.choose(step)
      else controller.submitInput(step)
    }
    controller.submitInput(WEB_ANSWER[other])
    expect(current().page?.path).toBe('web_equivocada')
  })

  it('uses a 4-digit keypad for the basement lock and rejects anything else', () => {
    const { controller, current, warnings } = play(locale)
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
    const { controller, current } = play(locale)
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
    controller.submitInput(WEB_ANSWER[locale])
    controller.submitInput('Pedro Cristóbal')
    expect(current().page?.path).toBe('victima_muerta')
    controller.choose(0)
    controller.submitInput('María Luisa González')

    expect(current().status).toBe('ended')
    expect(current().stats.failures).toBe(5)
    const text = current().page?.blocks.map((block) => ('text' in block ? block.text.text : '')).join(' ')
    expect(text).toContain('5')
  })

  it('resumes a saved game mid-story by replaying the decisions', () => {
    const saves = createMemorySaveRepository()
    const first = play(locale, saves)
    first.controller.start()
    first.controller.submitInput('tenedor') // fail + retry
    first.controller.choose(0)
    first.controller.submitInput('TenedoR')
    first.controller.choose(3)
    first.controller.persist({ exitToTitle: true })

    const second = play(locale, saves)
    expect(second.controller.resume()).toBe(true)
    expect(second.current().page?.path).toBe('chalet')
    expect(second.current().presentation).toEqual({ scene: 'header_police', music: 'tension' })
    expect(second.current().stats).toMatchObject({ choices: 4, failures: 1 })
    second.controller.choose(1)
    expect(second.current().page?.path).toBe('sotano')
    expect(second.warnings).toEqual([])
  })

  it('only references images and links that exist, has no speakers and no raw markup', () => {
    const { controller, pages, current } = play(locale)
    controller.start()
    playWinningRun(controller, locale)

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
    const scene = current().presentation.scene
    if (scene) expect(story.images).toHaveProperty(scene)
  })
})

describe('escape story translations', () => {
  interface Instruction {
    readonly op: string
    readonly node?: string
  }
  type Program = { readonly nodes: Readonly<Record<string, { readonly instructions: readonly Instruction[] }>> }

  /** Per node: jump/detour targets and number of options — the structure every language must share. */
  function structureOf(locale: string) {
    const program = JSON.parse(story.locales[locale].dialogue.json) as Program
    return Object.fromEntries(
      Object.entries(program.nodes).map(([title, node]) => [
        title,
        {
          jumps: [...new Set(node.instructions.filter((i) => i.op === 'runNode' || i.op === 'detour').map((i) => i.node))].sort(),
          options: node.instructions.filter((i) => i.op === 'addOption').length,
        },
      ]),
    )
  }

  it.each(LOCALES.filter((code) => code !== story.defaultLocale))('%s has the same nodes, options and jumps as the default', (locale) => {
    expect(structureOf(locale)).toEqual(structureOf(story.defaultLocale))
  })

  it('keeps the web riddle blanks one letter per answer letter', () => {
    const noteOf = (locale: string) => {
      const { controller, current } = play(locale)
      controller.start()
      for (const step of ['TenedoR', 3, 1, '0426'] as const) {
        if (typeof step === 'number') controller.choose(step)
        else controller.submitInput(step)
      }
      const label = current().page?.input?.label.text ?? ''
      return (label.match(/_/g) ?? []).length
    }
    for (const locale of LOCALES) expect(noteOf(locale), locale).toBe(WEB_ANSWER[locale].length)
  })
})
