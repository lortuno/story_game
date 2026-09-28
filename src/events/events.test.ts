import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEventBus } from './event-bus'
import { createBatchingSink, createBeaconSender } from './sinks'
import type { StoryEvent } from './types'

const event = (seq: number): StoryEvent => ({
  id: `e${seq}`,
  type: 'choice.made',
  storyId: 's',
  sessionId: 'x',
  seq,
  at: '2026-01-01T00:00:00.000Z',
  payload: { path: 'a', index: 0, text: 'Go' },
})

describe('createEventBus', () => {
  it('delivers events to every subscriber until they unsubscribe', () => {
    const bus = createEventBus()
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribe = bus.subscribe(first)
    bus.subscribe(second)

    bus.publish(event(1))
    unsubscribe()
    bus.publish(event(2))

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('isolates a throwing listener from the others', () => {
    const onError = vi.fn()
    const bus = createEventBus(onError)
    const healthy = vi.fn()
    bus.subscribe(() => {
      throw new Error('boom')
    })
    bus.subscribe(healthy)

    bus.publish(event(1))

    expect(healthy).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(expect.any(Error), event(1))
  })
})

describe('createBatchingSink', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends a batch as soon as it is full', () => {
    const send = vi.fn()
    const sink = createBatchingSink({ send, maxBatchSize: 2 })
    sink.handle(event(1))
    sink.handle(event(2))
    expect(send).toHaveBeenCalledWith([event(1), event(2)])
    sink.dispose()
  })

  it('flushes on a timer', () => {
    vi.useFakeTimers()
    const send = vi.fn()
    const sink = createBatchingSink({ send, flushIntervalMs: 1000 })
    sink.handle(event(1))
    expect(send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(send).toHaveBeenCalledWith([event(1)])
    sink.dispose()
  })

  it('flushes when the page becomes hidden and on dispose, never sending empty batches', () => {
    const send = vi.fn()
    const sink = createBatchingSink({ send })
    sink.handle(event(1))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    sink.dispose()
    expect(send).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })
})

describe('createBeaconSender', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers sendBeacon', () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { sendBeacon })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    createBeaconSender('/events', vi.fn())([event(1)])

    expect(sendBeacon).toHaveBeenCalledWith('/events', expect.any(Blob))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to fetch and reports failures', async () => {
    vi.stubGlobal('navigator', { sendBeacon: () => false })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    const onError = vi.fn()

    createBeaconSender('/events', onError)([event(1)])
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
  })
})
