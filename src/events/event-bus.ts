import type { StoryEvent, StoryEventListener } from './types'

export interface EventBus {
  publish(event: StoryEvent): void
  /** Returns an unsubscribe function. */
  subscribe(listener: StoryEventListener): () => void
}

export type ListenerErrorHandler = (error: unknown, event: StoryEvent) => void

/**
 * Synchronous pub/sub. A failing listener (e.g. a broken analytics sink) is isolated
 * and reported, never allowed to break the game loop or other listeners.
 */
export function createEventBus(onListenerError: ListenerErrorHandler = reportListenerError): EventBus {
  const listeners = new Set<StoryEventListener>()

  return {
    publish(event) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          onListenerError(error, event)
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function reportListenerError(error: unknown, event: StoryEvent): void {
  console.error(`[events] listener failed for ${event.type}`, error)
}
