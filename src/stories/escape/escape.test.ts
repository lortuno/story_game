/**
 * Walkthrough of the real story: guarantees every puzzle answer from the original
 * PHP version still works and every tag/asset referenced by the ink exists.
 */
import { describe, expect, it } from 'vitest'
import { StoryController } from '../../engine/story-controller'
import type { Page } from '../../engine/types'
import { parseInline } from '../../engine/markup'
import story from './index'

function play() {
  const warnings: string[] = []
  const pages: Page[] = []
  const controller = new StoryController({
    storyId: story.id,
    ink: story.ink,
    onWarning: (message) => warnings.push(message),
  })
  controller.subscribe(() => {
    const page = controller.getSnapshot().page
    if (page && pages.at(-1) !== page) pages.push(page)
  })
  return { controller, pages, warnings, current: () => controller.getSnapshot() }
}

describe('escape story', () => {
  it('can be completed with the original answers', () => {
    const { controller, pages, warnings, current } = play()
    controller.start()

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
    expect(current().page?.path).toBe('apartamento.tablet_bloqueada')
    expect(current().page?.input?.kind).toBe('password')
  })

  it('routes every wrong answer to a retry page that returns to the puzzle', () => {
    const { controller, current } = play()
    controller.start()
    controller.submitInput('TenedoR')
    controller.choose(0) // wrong route
    expect(current().page?.outcome).toBe('fail')
    controller.choose(0)
    expect(current().page?.path).toBe('tablet.mensaje')
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
    expect(current().page?.path).toBe('oscuridad.victima_muerta')
    controller.choose(0)
    controller.submitInput('María Luisa González')

    expect(current().status).toBe('ended')
    expect(current().stats.failures).toBe(5)
    const text = current().page?.blocks.map((block) => ('text' in block ? block.text : '')).join(' ')
    expect(text).toContain('5 veces')
  })

  it('only references images and links that exist', () => {
    const { controller, pages, current } = play()
    controller.start()
    for (const answer of ['TenedoR', 3, 1, '0426', 'oscuridad', 'María Luisa González'] as const) {
      if (typeof answer === 'number') controller.choose(answer)
      else controller.submitInput(answer)
    }
    const scenes = new Set<string>()
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.kind === 'figure') {
          for (const image of block.images) expect(story.images, image.key).toHaveProperty(image.key)
        }
        const texts = block.kind === 'group' ? block.items : 'text' in block ? [block.text] : []
        for (const token of texts.flatMap((text) => parseInline(text))) {
          if (token.kind === 'link') expect(story.links, token.key).toHaveProperty(token.key)
        }
      }
    }
    scenes.add(current().presentation.scene ?? '')
    for (const scene of scenes) if (scene) expect(story.images).toHaveProperty(scene)
  })
})
