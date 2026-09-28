import { describe, expect, it } from 'vitest'
import { testDefinition } from '../test/fixtures'
import { localizeStory, resolveLocale } from './locale'

const none = { search: '', stored: null, preferred: [] }

describe('resolveLocale', () => {
  it.each([
    ['?lang=EN', { ...none, search: '?lang=EN', stored: 'es' }, 'en'],
    ['remembered choice', { ...none, stored: 'en', preferred: ['es-ES'] }, 'en'],
    ['browser language', { ...none, preferred: ['fr-FR', 'en-US'] }, 'en'],
    ['unknown everything', { search: '?lang=xx', stored: 'de', preferred: ['fr'] }, 'es'],
    ['prototype keys', { ...none, search: '?lang=__proto__' }, 'es'],
  ])('%s', (_label, sources, expected) => {
    expect(resolveLocale(testDefinition, sources)).toBe(expected)
  })
})

describe('localizeStory', () => {
  it('merges the locale content with the shared parts', () => {
    const story = localizeStory(testDefinition, 'en')
    expect(story).toMatchObject({ id: 'mini', locale: 'en', availableLocales: ['es', 'en'], startNode: 'start' })
    expect(story.meta.lang).toBe('en-GB')
    expect(story).not.toHaveProperty('locales')
  })

  it('falls back to the default locale', () => {
    expect(localizeStory(testDefinition, 'xx').locale).toBe('es')
  })
})
