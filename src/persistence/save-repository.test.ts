import { describe, expect, it, vi } from 'vitest'
import {
  createLocalStorageSaveRepository,
  createMemorySaveRepository,
  isSaveGame,
  SAVE_VERSION,
  type SaveGame,
} from './save-repository'

const game: SaveGame = {
  version: SAVE_VERSION,
  storyId: 'escape',
  storyHash: 'abc',
  sessionId: 's1',
  inkState: '{}',
  presentation: { scene: 'x', music: null },
  stats: { choices: 1, hintsRevealed: 0, failures: 0 },
  playtimeMs: 1000,
  savedAt: '2026-01-01T00:00:00.000Z',
}

describe('createLocalStorageSaveRepository', () => {
  it('round-trips a save and clears it', () => {
    const repo = createLocalStorageSaveRepository()
    repo.save(game)
    expect(repo.load('escape')).toEqual(game)
    repo.clear('escape')
    expect(repo.load('escape')).toBeNull()
  })

  it('rejects tampered or malformed data', () => {
    const repo = createLocalStorageSaveRepository()
    localStorage.setItem('story-game:save:escape', JSON.stringify({ ...game, playtimeMs: -5 }))
    expect(repo.load('escape')).toBeNull()
    localStorage.setItem('story-game:save:escape', '{not json')
    expect(repo.load('escape')).toBeNull()
  })

  it('rejects a save stored under another story id', () => {
    localStorage.setItem('story-game:save:other', JSON.stringify(game))
    expect(createLocalStorageSaveRepository().load('other')).toBeNull()
  })

  it('reports storage failures instead of throwing', () => {
    const onError = vi.fn()
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    } as unknown as Storage
    const repo = createLocalStorageSaveRepository(broken, onError)

    expect(repo.load('escape')).toBeNull()
    repo.save(game)
    repo.clear('escape')
    expect(onError).toHaveBeenCalledTimes(3)
  })

  it('works without storage at all', () => {
    const repo = createLocalStorageSaveRepository(null)
    repo.save(game)
    expect(repo.load('escape')).toBeNull()
  })
})

describe('createMemorySaveRepository', () => {
  it('round-trips and clears', () => {
    const repo = createMemorySaveRepository()
    repo.save(game)
    expect(repo.load('escape')).toBe(game)
    repo.clear('escape')
    expect(repo.load('escape')).toBeNull()
  })
})

describe('isSaveGame', () => {
  it.each([null, 'x', { ...game, version: 99 }, { ...game, stats: null }, { ...game, presentation: { scene: 1 } }])(
    'rejects %j',
    (value) => {
      expect(isSaveGame(value)).toBe(false)
    },
  )
})
