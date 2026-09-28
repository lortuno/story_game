import { useStoryContext } from '../app/story-context'
import styles from './Controls.module.css'
import { formatStoryDate } from './format'

interface StoryDateProps {
  /** yyyy-mm-dd */
  readonly iso: string
  readonly lang: string
}

/** The in-world date, styled like a stamp on a case file. */
export function StoryDate({ iso, lang }: StoryDateProps) {
  const { strings } = useStoryContext()
  return (
    <time className={styles.storyDate} dateTime={iso} title={strings.storyDate}>
      <span className="visually-hidden">{strings.storyDate}: </span>
      {formatStoryDate(iso, lang)}
    </time>
  )
}
