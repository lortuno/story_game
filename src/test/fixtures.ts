import mini from '../engine/__fixtures__/mini.ink'
import { createEventBus } from '../events/event-bus'
import type { StoryEvent } from '../events/types'
import { createMemorySaveRepository } from '../persistence/save-repository'
import type { Services } from '../app/services'
import type { StoryDefinition } from '../stories/types'

export const testStory: StoryDefinition = {
  id: 'mini',
  meta: {
    title: 'Mini',
    tagline: 'test',
    description: 'A tiny story for tests.',
    lang: 'es',
    credits: '© test',
    date: '2020-04-23',
    timeLimitMinutes: 10,
    cover: 'hall',
  },
  ink: mini,
  images: { hall: { src: '/hall.webp', width: 800, height: 400 } },
  audio: { music: { calm: '/calm.opus' }, sfx: {} },
  links: { docs: 'https://example.com/docs' },
}

export function createTestServices(): Services & { readonly received: StoryEvent[] } {
  const received: StoryEvent[] = []
  const events = createEventBus()
  events.subscribe((event) => received.push(event))
  return { events, saves: createMemorySaveRepository(), received }
}
