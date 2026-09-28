import { assertHttpsLinks, collectImages, collectUrls } from '../assets'
import type { StoryDefinition, StoryMeta } from '../types'
import dialogueEn from './dialogue/en/escape.yarnproject'
import dialogueEs from './dialogue/es/escape.yarnproject'
import dimensions from './images/dimensions.json'

const images = import.meta.glob<string>('./images/*.webp', { eager: true, query: '?url', import: 'default' })
const music = import.meta.glob<string>('./audio/music/*.{opus,ogg,mp3,m4a}', { eager: true, query: '?url', import: 'default' })
const sfx = import.meta.glob<string>('./audio/sfx/*.{opus,ogg,mp3,m4a}', { eager: true, query: '?url', import: 'default' })

const shared = {
  title: 'Escape',
  tagline: 'the QUARANTINE',
  date: '2020-04-23',
  timeLimitMinutes: 60,
  cover: 'header_police',
} satisfies Partial<StoryMeta>

const story: StoryDefinition = {
  id: 'escape',
  defaultLocale: 'es',
  locales: {
    es: {
      meta: {
        ...shared,
        description: 'Sigue las pistas y atrapa al asesino antes de que escape. Para jugar solo o en grupo: solo necesitas un bloc de notas.',
        lang: 'es',
        credits: '© lortuno. Imágenes: Unsplash.',
      },
      dialogue: dialogueEs,
    },
    en: {
      meta: {
        ...shared,
        description: 'Follow the clues and catch the killer before he escapes. Play alone or in a group: all you need is a notepad.',
        // en-GB keeps the in-world date as 23/04/2020, matching the clues.
        lang: 'en-GB',
        credits: '© lortuno. Images: Unsplash.',
      },
      dialogue: dialogueEn,
    },
  },
  startNode: 'apartamento',
  images: collectImages(images, dimensions),
  audio: { music: collectUrls(music), sfx: collectUrls(sfx) },
  // Riddles are not translated: the books and recipe videos are the Spanish originals in every language.
  links: assertHttpsLinks({
    libros: 'https://drive.google.com/open?id=1pAEPGQ9WOqGPhiStMQE-dK4xcCRW0XsF',
    huevos: 'https://www.youtube.com/watch?v=97SvRSXehM0',
    mantequilla: 'https://www.youtube.com/watch?v=uDZ716e4eSU',
    sal: 'https://www.youtube.com/watch?v=8WHlhgJ_uB4',
    aceite: 'https://www.youtube.com/watch?v=B7UTrWig73c',
    cebolla: 'https://www.youtube.com/watch?v=bX4CmPR4qIU',
    patatas: 'https://www.youtube.com/watch?v=X4xwEx0SMVo',
  }),
}

export default story
