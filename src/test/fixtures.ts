import mini from '../engine/__fixtures__/mini/mini.yarnproject'
import { createEventBus } from '../events/event-bus'
import type { StoryEvent } from '../events/types'
import { createMemorySaveRepository } from '../persistence/save-repository'
import type { Services } from '../app/services'
import type { StoryContextValue } from '../app/story-context'
import { getStrings } from '../i18n/strings'
import { localizeStory } from '../stories/locale'
import type { StoryDefinition, StoryMeta } from '../stories/types'

const meta: StoryMeta = {
  title: 'Mini',
  tagline: 'test',
  description: 'Una historia mínima para los tests.',
  lang: 'es',
  credits: '© test',
  date: '2020-04-23',
  timeLimitMinutes: 10,
  cover: 'hall',
}

export const testDefinition: StoryDefinition = {
  id: 'mini',
  defaultLocale: 'es',
  locales: {
    es: { meta, dialogue: mini },
    en: { meta: { ...meta, description: 'A tiny story for tests.', lang: 'en-GB' }, dialogue: mini },
  },
  startNode: 'start',
  images: { hall: { src: '/hall.webp', width: 800, height: 400 } },
  audio: { music: { calm: '/calm.opus' }, sfx: {} },
  links: { docs: 'https://example.com/docs' },
}

export const testStory = localizeStory(testDefinition, 'es')

export const testContext: StoryContextValue = {
  story: testStory,
  strings: getStrings('es'),
  changeLocale: () => {},
}

export function createTestServices(): Services & { readonly received: StoryEvent[] } {
  const received: StoryEvent[] = []
  const events = createEventBus()
  events.subscribe((event) => received.push(event))
  return { events, saves: createMemorySaveRepository(), received }
}
