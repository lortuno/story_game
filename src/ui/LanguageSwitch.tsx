import { useStoryContext } from '../app/story-context'
import { getStrings } from '../i18n/strings'
import styles from './Controls.module.css'

/** Segmented ES | EN switch. Each option is labelled in its own language. Hidden for single-language stories. */
export function LanguageSwitch() {
  const { story, strings, changeLocale } = useStoryContext()
  if (story.availableLocales.length < 2) return null

  return (
    <div className={styles.languageSwitch} role="group" aria-label={strings.language}>
      {story.availableLocales.map((locale) => {
        const name = getStrings(locale).languageName
        const isCurrent = locale === story.locale
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            className={styles.languageOption}
            aria-pressed={isCurrent}
            aria-label={name}
            title={name}
            onClick={() => changeLocale(locale)}
          >
            {locale.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
