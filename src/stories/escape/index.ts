import { assertHttpsLinks, collectImages, collectUrls } from '../assets'
import type { StoryDefinition } from '../types'
import dimensions from './images/dimensions.json'
import ink from './ink/main.ink'

const images = import.meta.glob<string>('./images/*.webp', { eager: true, query: '?url', import: 'default' })
const music = import.meta.glob<string>('./audio/music/*.{opus,ogg,mp3,m4a}', { eager: true, query: '?url', import: 'default' })
const sfx = import.meta.glob<string>('./audio/sfx/*.{opus,ogg,mp3,m4a}', { eager: true, query: '?url', import: 'default' })

const story: StoryDefinition = {
  id: 'escape',
  meta: {
    title: 'Escape',
    tagline: 'the QUARANTINE',
    description: 'Sigue las pistas y atrapa al asesino antes de que escape. Para jugar solo o en grupo: solo necesitas un bloc de notas.',
    lang: 'es',
    credits: '© lortuno. Imágenes: Unsplash.',
    timeLimitMinutes: 69,
    cover: 'header_police',
  },
  ink,
  images: collectImages(images, dimensions),
  audio: { music: collectUrls(music), sfx: collectUrls(sfx) },
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
