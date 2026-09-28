import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { assertHttpsLinks, collectImages, collectUrls, keyFromPath } from '../stories/assets'
import { loadStory, resolveStoryId } from '../stories/registry'
import { getStrings } from '../i18n/strings'
import { App } from './App'
import { createServices, validEndpoint } from './services'
import { createTestServices } from '../test/fixtures'

describe('App', () => {
  it('loads the default story and shows its title screen', async () => {
    await act(async () => {
      render(<App storyId="escape" services={createTestServices()} />)
      await loadStory('escape')
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Escape')
    expect(screen.getByRole('button', { name: 'Nueva partida' })).toBeInTheDocument()
  })
})

describe('story registry', () => {
  it('resolves known ids and falls back for unknown ones', () => {
    expect(resolveStoryId('?story=escape')).toBe('escape')
    expect(resolveStoryId('?story=__proto__')).toBe('escape')
    expect(resolveStoryId('')).toBe('escape')
  })

  it('caches loads and rejects unknown stories', async () => {
    expect(loadStory('escape')).toBe(loadStory('escape'))
    await expect(loadStory('nope')).rejects.toThrow('Unknown story')
  })
})

describe('story assets', () => {
  it('keys assets by lower-cased file name', () => {
    expect(keyFromPath('./images/Poker_Table.webp')).toBe('poker_table')
    expect(() => keyFromPath('no-extension')).toThrow()
    expect(collectUrls({ './audio/music/tension.opus': '/t.opus' })).toEqual({ tension: '/t.opus' })
  })

  it('requires dimensions for every image', () => {
    expect(collectImages({ './a.webp': '/a.webp' }, { a: { width: 1, height: 2 } })).toEqual({
      a: { src: '/a.webp', width: 1, height: 2 },
    })
    expect(() => collectImages({ './b.webp': '/b.webp' }, {})).toThrow('npm run images')
  })

  it('only accepts https links', () => {
    expect(() => assertHttpsLinks({ bad: 'http://example.com' })).toThrow('https')
    expect(() => assertHttpsLinks({ bad: 'javascript:alert(1)' })).toThrow()
  })
})

describe('services', () => {
  it.each([
    [undefined, null],
    ['/api/events', '/api/events'],
    ['//evil.example', null],
    ['http://insecure.example', null],
    ['https://api.example/events', 'https://api.example/events'],
    ['not a url', null],
  ])('validEndpoint(%s) → %s', (value, expected) => {
    expect(validEndpoint(value)).toBe(expected)
  })

  it('wires an event sink only when an endpoint is configured', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const services = createServices({ DEV: true, VITE_EVENTS_ENDPOINT: '/api/events' } as unknown as ImportMetaEnv)
    expect(services.saves.load('escape')).toBeNull()
    services.events.publish({
      id: '1',
      type: 'story.error',
      storyId: 'escape',
      sessionId: 's',
      seq: 1,
      at: '',
      payload: { message: 'x' },
    })
    expect(debug).toHaveBeenCalled()
  })
})

describe('getStrings', () => {
  it('falls back to Spanish', () => {
    expect(getStrings('es-ES')).toBe(getStrings('es'))
    expect(getStrings('xx').newGame).toBe('Nueva partida')
  })
})
