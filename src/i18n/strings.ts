/** UI chrome strings, selected by the story language. Story text itself lives in the Yarn scripts. */
export interface UiStrings {
  /** This language's own name, shown in the language switch ("Español", "English"). */
  readonly languageName: string
  readonly language: string
  readonly loading: string
  readonly loadFailed: string
  readonly newGame: string
  readonly restartGame: string
  readonly continueGame: string
  readonly menu: string
  readonly soundOn: string
  readonly soundOff: string
  readonly playtime: string
  readonly storyDate: string
  readonly timeLimit: (minutes: number) => string
  readonly hintsTitle: string
  readonly answerPlaceholder: string
  readonly keypadDelete: string
  readonly keypadEnter: (action: string) => string
  readonly keypadStatus: (digits: string, length: number) => string
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
  languageName: 'Español',
  language: 'Idioma',
  loading: 'Cargando historia…',
  loadFailed: 'No se ha podido cargar la historia.',
  newGame: 'Nueva partida',
  restartGame: 'Empezar de nuevo',
  continueGame: 'Continuar',
  menu: 'Menú',
  soundOn: 'Activar sonido',
  soundOff: 'Silenciar',
  playtime: 'Tiempo de juego',
  storyDate: 'Fecha del caso',
  timeLimit: (minutes) => `Objetivo: menos de ${minutes} minutos`,
  hintsTitle: '¿Atascados? Pedid ayuda',
  answerPlaceholder: 'Escribe tu respuesta',
  keypadDelete: 'Borrar último dígito',
  keypadEnter: (action) => `Almohadilla: ${action}`,
  keypadStatus: (digits, length) => {
    if (digits.length === 0) return `Introduce ${length} dígitos`
    const entered = digits.split('').join(' ')
    const missing = length - digits.length
    return missing === 0
      ? `Combinación ${entered}. Pulsa almohadilla para probarla.`
      : `Combinación ${entered}. ${missing === 1 ? 'Falta 1 dígito' : `Faltan ${missing} dígitos`}.`
  },
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

const en: UiStrings = {
  languageName: 'English',
  language: 'Language',
  loading: 'Loading story…',
  loadFailed: 'The story could not be loaded.',
  newGame: 'New game',
  restartGame: 'Start over',
  continueGame: 'Continue',
  menu: 'Menu',
  soundOn: 'Turn sound on',
  soundOff: 'Mute',
  playtime: 'Playing time',
  storyDate: 'Case date',
  timeLimit: (minutes) => `Goal: under ${minutes} minutes`,
  hintsTitle: 'Stuck? Ask for help',
  answerPlaceholder: 'Type your answer',
  keypadDelete: 'Delete last digit',
  keypadEnter: (action) => `Hash key: ${action}`,
  keypadStatus: (digits, length) => {
    if (digits.length === 0) return `Enter ${length} digits`
    const entered = digits.split('').join(' ')
    const missing = length - digits.length
    return missing === 0
      ? `Combination ${entered}. Press the hash key to try it.`
      : `Combination ${entered}. ${missing === 1 ? '1 digit left' : `${missing} digits left`}.`
  },
  opensInNewTab: '(opens in a new tab)',
  enlargeImage: (caption) => `Enlarge image: ${caption}`,
  close: 'Close',
  openOriginal: 'Open in a new tab',
  endTitle: 'Case closed',
  endStats: ({ choices, hints, failures }) =>
    `${choices} decisions · ${hints} hints used · ${failures} ${failures === 1 ? 'mistake' : 'mistakes'}`,
  playAgain: 'Play again',
  errorTitle: 'The story stopped because of an error',
  retry: 'Retry from the last checkpoint',
}

const catalogs: Readonly<Record<string, UiStrings>> = { es, en }

export function getStrings(lang: string): UiStrings {
  return catalogs[lang] ?? catalogs[lang.split('-')[0]] ?? es
}
