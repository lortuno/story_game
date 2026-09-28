/**
 * Composition root for non-React services. Swap implementations here (e.g. a
 * backend SaveRepository) without touching the engine or the UI.
 */
import { createEventBus, type EventBus } from '../events/event-bus'
import { createBatchingSink, createBeaconSender, createDevLogSink } from '../events/sinks'
import { createLocalStorageSaveRepository, type SaveRepository } from '../persistence/save-repository'

export interface Services {
  readonly events: EventBus
  readonly saves: SaveRepository
}

export function createServices(env: ImportMetaEnv = import.meta.env): Services {
  const events = createEventBus()
  if (env.DEV) events.subscribe(createDevLogSink())

  const endpoint = validEndpoint(env.VITE_EVENTS_ENDPOINT)
  if (endpoint) {
    const sink = createBatchingSink({
      send: createBeaconSender(endpoint, (error) => console.warn('[events] delivery failed', error)),
    })
    events.subscribe(sink.handle)
  }

  const saves = createLocalStorageSaveRepository(undefined, (error) => console.warn('[saves]', error))
  return { events, saves }
}

/** Accepts same-origin paths ("/api/events") or https URLs; anything else is ignored. */
export function validEndpoint(value: string | undefined): string | null {
  if (!value) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}
