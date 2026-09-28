import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioManager } from './audio-manager'

interface FakeAudio {
  src: string
  volume: number
  loop: boolean
  muted: boolean
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
}

let created: FakeAudio[] = []
const createAudio = (src: string) => {
  const audio: FakeAudio = {
    src,
    volume: 1,
    loop: false,
    muted: false,
    play: vi.fn().mockRejectedValue(new Error('autoplay blocked')),
    pause: vi.fn(),
  }
  created.push(audio)
  return audio as unknown as HTMLAudioElement
}

const library = { music: { calm: '/calm.opus', tense: '/tense.opus' }, sfx: { door: '/door.opus' } }

beforeEach(() => {
  vi.useFakeTimers()
  created = []
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AudioManager', () => {
  it('fades music in, looping, and tolerates blocked autoplay', () => {
    const audio = new AudioManager(library, { createAudio, fadeMs: 100, musicVolume: 0.5 })
    audio.playMusic('calm')
    expect(created[0]).toMatchObject({ src: '/calm.opus', loop: true, volume: 0 })
    vi.advanceTimersByTime(100)
    expect(created[0].volume).toBeCloseTo(0.5)
    expect(audio.currentMusic).toBe('calm')
  })

  it('crossfades to a new track and pauses the old one', () => {
    const audio = new AudioManager(library, { createAudio, fadeMs: 100 })
    audio.playMusic('calm')
    vi.advanceTimersByTime(100)
    audio.playMusic('tense')
    vi.advanceTimersByTime(100)
    expect(created[0].pause).toHaveBeenCalled()
    expect(created[0].volume).toBe(0)
    expect(audio.currentMusic).toBe('tense')
  })

  it('does not restart the track that is already playing', () => {
    const audio = new AudioManager(library, { createAudio })
    audio.playMusic('calm')
    audio.playMusic('calm')
    expect(created).toHaveLength(1)
  })

  it('stops music with null', () => {
    const audio = new AudioManager(library, { createAudio, fadeMs: 50 })
    audio.playMusic('calm')
    audio.playMusic(null)
    vi.advanceTimersByTime(50)
    expect(created[0].pause).toHaveBeenCalled()
    expect(audio.currentMusic).toBeNull()
  })

  it('warns once about missing files and stays silent', () => {
    const onWarning = vi.fn()
    const audio = new AudioManager(library, { createAudio, onWarning })
    audio.playMusic('missing')
    audio.playMusic(null)
    audio.playMusic('missing')
    audio.playSfx('nope')
    expect(created).toHaveLength(0)
    expect(onWarning).toHaveBeenCalledTimes(2)
  })

  it('plays sound effects unless muted, and mutes current music', () => {
    const audio = new AudioManager(library, { createAudio })
    audio.playSfx('door')
    expect(created).toHaveLength(1)
    audio.playMusic('calm')
    audio.setMuted(true)
    expect(created[1].muted).toBe(true)
    expect(audio.isMuted).toBe(true)
    audio.playSfx('door')
    expect(created).toHaveLength(2)
  })

  it('stopAll pauses immediately', () => {
    const audio = new AudioManager(library, { createAudio })
    audio.playMusic('calm')
    audio.stopAll()
    expect(created[0].pause).toHaveBeenCalled()
    expect(audio.currentMusic).toBeNull()
  })
})
