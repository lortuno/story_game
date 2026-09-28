/**
 * Music and sound effects driven by `# music:` / `# sfx:` tags.
 * - Files are fetched lazily, on first play (nothing downloads for silent stories).
 * - Music crossfades between tracks and loops.
 * - Browsers block audio before a user gesture; play() rejections are expected and ignored.
 */
import type { AudioLibrary } from '../stories/types'

export interface AudioManagerOptions {
  readonly fadeMs?: number
  readonly musicVolume?: number
  readonly sfxVolume?: number
  readonly createAudio?: (src: string) => HTMLAudioElement
  readonly onWarning?: (message: string) => void
}

const FADE_STEP_MS = 50

export class AudioManager {
  private readonly library: AudioLibrary
  private readonly fadeMs: number
  private readonly musicVolume: number
  private readonly sfxVolume: number
  private readonly createAudio: (src: string) => HTMLAudioElement
  private readonly warn: (message: string) => void
  private readonly warnedKeys = new Set<string>()
  private readonly fades = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>()
  private current: { readonly key: string; readonly element: HTMLAudioElement } | null = null
  private muted = false

  constructor(library: AudioLibrary, options: AudioManagerOptions = {}) {
    this.library = library
    this.fadeMs = options.fadeMs ?? 1200
    this.musicVolume = options.musicVolume ?? 0.6
    this.sfxVolume = options.sfxVolume ?? 0.9
    this.createAudio = options.createAudio ?? ((src) => new Audio(src))
    this.warn = options.onWarning ?? ((message) => console.warn(`[audio] ${message}`))
  }

  get isMuted(): boolean {
    return this.muted
  }

  get currentMusic(): string | null {
    return this.current?.key ?? null
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.current) this.current.element.muted = muted
  }

  /** Crossfades to `key`; `null` fades the music out. Same key = no-op. */
  playMusic(key: string | null): void {
    if (key === this.currentMusic) return
    const previous = this.current
    this.current = null
    if (previous) this.fadeTo(previous.element, 0, () => previous.element.pause())
    if (key === null) return

    const src = this.resolve('music', key)
    if (!src) return
    const element = this.createAudio(src)
    element.loop = true
    element.volume = 0
    element.muted = this.muted
    this.current = { key, element }
    this.start(element)
    this.fadeTo(element, this.musicVolume)
  }

  playSfx(key: string): void {
    if (this.muted) return
    const src = this.resolve('sfx', key)
    if (!src) return
    const element = this.createAudio(src)
    element.volume = this.sfxVolume
    this.start(element)
  }

  /** Stops everything immediately (unmount, leaving the story). */
  stopAll(): void {
    for (const timer of this.fades.values()) clearInterval(timer)
    this.fades.clear()
    this.current?.element.pause()
    this.current = null
  }

  private resolve(kind: keyof AudioLibrary, key: string): string | null {
    const src = this.library[kind][key]
    if (src) return src
    // Stories may reference tracks that haven't been produced yet: warn once, stay silent.
    const id = `${kind}:${key}`
    if (!this.warnedKeys.has(id)) {
      this.warnedKeys.add(id)
      this.warn(`No ${kind} file for "${key}" (add it under audio/${kind}/)`)
    }
    return null
  }

  private start(element: HTMLAudioElement): void {
    element.play()?.catch(() => {
      // Autoplay blocked or file failed; the story remains fully playable without sound.
    })
  }

  private fadeTo(element: HTMLAudioElement, target: number, done?: () => void): void {
    const existing = this.fades.get(element)
    if (existing) clearInterval(existing)
    const steps = Math.max(1, Math.round(this.fadeMs / FADE_STEP_MS))
    const delta = (target - element.volume) / steps
    let remaining = steps
    const timer = setInterval(() => {
      remaining -= 1
      element.volume = remaining <= 0 ? target : clampVolume(element.volume + delta)
      if (remaining <= 0) {
        clearInterval(timer)
        this.fades.delete(element)
        done?.()
      }
    }, FADE_STEP_MS)
    this.fades.set(element, timer)
  }
}

const clampVolume = (volume: number) => Math.min(1, Math.max(0, volume))
