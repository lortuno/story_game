import { useId } from 'react'
import { useStoryContext } from '../app/story-context'
import { MAX_INPUT_LENGTH } from '../engine/story-controller'
import type { ChoiceView, InputRequest } from '../engine/types'
import styles from './Controls.module.css'
import { RichText } from './RichText'

interface ChoicePanelProps {
  readonly choices: readonly ChoiceView[]
  readonly input: InputRequest | null
  readonly onChoose: (index: number) => void
  readonly onSubmit: (value: string) => void
}

export function ChoicePanel({ choices, input, onChoose, onSubmit }: ChoicePanelProps) {
  if (input && choices[0]) return <AnswerForm input={input} submitLabel={choices[0].text} onSubmit={onSubmit} />

  return (
    <ul className={styles.choices}>
      {choices.map((choice) => (
        <li key={choice.index}>
          <button type="button" className={styles.choice} onClick={() => onChoose(choice.index)}>
            {choice.text}
          </button>
        </li>
      ))}
    </ul>
  )
}

interface AnswerFormProps {
  readonly input: InputRequest
  readonly submitLabel: string
  readonly onSubmit: (value: string) => void
}

function AnswerForm({ input, submitLabel, onSubmit }: AnswerFormProps) {
  const { strings } = useStoryContext()
  const fieldId = useId()

  return (
    <form className={styles.answer} action={(data) => onSubmit(String(data.get('answer') ?? ''))}>
      <label htmlFor={fieldId} className={styles.answerLabel}>
        <RichText text={input.label} />
      </label>
      <div className={styles.answerRow}>
        <input
          id={fieldId}
          name="answer"
          type={input.kind === 'password' ? 'password' : 'text'}
          inputMode={input.kind === 'code' ? 'numeric' : undefined}
          placeholder={strings.answerPlaceholder}
          maxLength={MAX_INPUT_LENGTH}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <button type="submit" className="button">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
