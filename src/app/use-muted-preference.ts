import { useState } from 'react'

const KEY = 'story-game:muted'

/** Per-viewer convenience, so browser storage is fine; it may be unavailable. */
export function useMutedPreference(): readonly [boolean, (muted: boolean) => void] {
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })

  const setMuted = (value: boolean) => {
    setMutedState(value)
    try {
      localStorage.setItem(KEY, value ? '1' : '0')
    } catch {
      // storage blocked: preference lasts for this visit only
    }
  }

  return [muted, setMuted] as const
}
