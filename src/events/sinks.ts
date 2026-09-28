/**
 * Event sinks: where published events go. Today only a dev logger is active;
 * set VITE_EVENTS_ENDPOINT to ship batches to a backend (see src/app/services.ts).
 */
import type { StoryEvent, StoryEventListener } from './types'

export type BatchSender = (batch: readonly StoryEvent[]) => void

export interface BatchingSink {
  readonly handle: StoryEventListener
  flush(): void
  dispose(): void
}

export interface BatchingSinkOptions {
  readonly send: BatchSender
  readonly maxBatchSize?: number
  readonly flushIntervalMs?: number
}

const DEFAULT_MAX_BATCH = 25
const DEFAULT_FLUSH_INTERVAL_MS = 5_000

/**
 * Buffers events and sends them in batches: when the batch is full, on a timer,
 * and when the page is hidden (the last reliable moment before a tab closes).
 */
export function createBatchingSink({
  send,
  maxBatchSize = DEFAULT_MAX_BATCH,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
}: BatchingSinkOptions): BatchingSink {
  let buffer: readonly StoryEvent[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    if (timer) clearTimeout(timer)
    timer = null
    if (buffer.length === 0) return
    const batch = buffer
    buffer = []
    send(batch)
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    handle(event) {
      buffer = [...buffer, event]
      if (buffer.length >= maxBatchSize) flush()
      else if (!timer) timer = setTimeout(flush, flushIntervalMs)
    },
    flush,
    dispose() {
      flush()
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange)
    },
  }
}

/**
 * Sends a batch as JSON with `navigator.sendBeacon` (survives page unload),
 * falling back to a keep-alive fetch. Fire-and-forget by design: gameplay never waits on it.
 */
export function createBeaconSender(endpoint: string, onError: (error: unknown) => void): BatchSender {
  return (batch) => {
    const body = JSON.stringify({ events: batch })
    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(endpoint, blob)) return
      fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
        .then((response) => {
          if (!response.ok) onError(new Error(`Event endpoint responded ${response.status}`))
        })
        .catch(onError)
    } catch (error) {
      onError(error)
    }
  }
}

/** Development aid: prints every event to the console. */
export function createDevLogSink(): StoryEventListener {
  return (event) => console.debug(`[event] ${event.type}`, event.payload)
}
