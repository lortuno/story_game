/**
 * Save games. The repository interface keeps storage swappable: localStorage today,
 * a backend later, without touching the engine.
 */
import type { PlayStats, Presentation } from '../engine/types'

export const SAVE_VERSION = 1

export interface SaveGame {
  readonly version: typeof SAVE_VERSION
  readonly storyId: string
  /** Compiled story hash; a save from a different story build is discarded. */
  readonly storyHash: string
  readonly sessionId: string
  /** ink state JSON captured at the start of the current page. */
  readonly inkState: string
  readonly presentation: Presentation
  readonly stats: PlayStats
  readonly playtimeMs: number
  readonly savedAt: string
}

export interface SaveRepository {
  load(storyId: string): SaveGame | null
  save(game: SaveGame): void
  clear(storyId: string): void
}

const KEY_PREFIX = 'story-game:save:'

export function createLocalStorageSaveRepository(
  storage: Storage | null = getLocalStorage(),
  onError: (error: unknown) => void = () => {},
): SaveRepository {
  return {
    load(storyId) {
      try {
        const raw = storage?.getItem(KEY_PREFIX + storyId)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        return isSaveGame(parsed) && parsed.storyId === storyId ? parsed : null
      } catch (error) {
        onError(error)
        return null
      }
    },
    save(game) {
      try {
        storage?.setItem(KEY_PREFIX + game.storyId, JSON.stringify(game))
      } catch (error) {
        // Quota exceeded / private mode: the game keeps working, just without saves.
        onError(error)
      }
    },
    clear(storyId) {
      try {
        storage?.removeItem(KEY_PREFIX + storyId)
      } catch (error) {
        onError(error)
      }
    },
  }
}

export function createMemorySaveRepository(): SaveRepository {
  let saves: Readonly<Record<string, SaveGame>> = {}
  return {
    load: (storyId) => saves[storyId] ?? null,
    save: (game) => {
      saves = { ...saves, [game.storyId]: game }
    },
    clear: (storyId) => {
      const { [storyId]: _removed, ...rest } = saves
      saves = rest
    },
  }
}

function getLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // access can throw when site data is blocked
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'

export function isSaveGame(value: unknown): value is SaveGame {
  if (!isRecord(value) || value.version !== SAVE_VERSION) return false
  const { presentation, stats } = value
  return (
    typeof value.storyId === 'string' &&
    typeof value.storyHash === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.inkState === 'string' &&
    typeof value.savedAt === 'string' &&
    isNonNegativeNumber(value.playtimeMs) &&
    isRecord(presentation) &&
    isNullableString(presentation.scene) &&
    isNullableString(presentation.music) &&
    isRecord(stats) &&
    isNonNegativeNumber(stats.choices) &&
    isNonNegativeNumber(stats.hintsRevealed) &&
    isNonNegativeNumber(stats.failures)
  )
}
