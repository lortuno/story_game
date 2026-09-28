/** UI chrome strings, selected by the story language. Story text itself lives in ink. */
export interface UiStrings {
  readonly loading: string
  readonly loadFailed: string
  readonly newGame: string
  readonly restartGame: string
  readonly continueGame: string
  readonly menu: string
  readonly soundOn: string
  readonly soundOff: string
  readonly playtime: string
  readonly timeLimit: (minutes: number) => string
  readonly hintsTitle: string
  readonly answerPlaceholder: string
  readonly opensInNewTab: string
  readonly enlargeImage: (caption: string) => string
  readonly close: string
  readonly openOriginal: string
  readonly endTitle: string
  readonly endStats: (stats: { choices: number; hints: number; failures: number }) => string
  readonly playAgain: string
  readonly errorTitle: string
  readonly retry: string
}

const es: UiStrings = {
  loading: 'Cargando historia…',
  loadFailed: 'No se ha podido cargar la historia.',
  newGame: 'Nueva partida',
  restartGame: 'Empezar de nuevo',
  continueGame: 'Continuar',
  menu: 'Menú',
  soundOn: 'Activar sonido',
  soundOff: 'Silenciar',
  playtime: 'Tiempo de juego',
  timeLimit: (minutes) => `Objetivo: menos de ${minutes} minutos`,
  hintsTitle: '¿Atascados? Pedid ayuda',
  answerPlaceholder: 'Escribe tu respuesta',
  opensInNewTab: '(se abre en otra pestaña)',
  enlargeImage: (caption) => `Ampliar imagen: ${caption}`,
  close: 'Cerrar',
  openOriginal: 'Abrir en otra pestaña',
  endTitle: 'Caso cerrado',
  endStats: ({ choices, hints, failures }) =>
    `${choices} decisiones · ${hints} pistas consultadas · ${failures} ${failures === 1 ? 'fallo' : 'fallos'}`,
  playAgain: 'Jugar otra vez',
  errorTitle: 'La historia se ha detenido por un error',
  retry: 'Reintentar desde el último punto',
}

const catalogs: Readonly<Record<string, UiStrings>> = { es }

export function getStrings(lang: string): UiStrings {
  return catalogs[lang] ?? catalogs[lang.split('-')[0]] ?? es
}
