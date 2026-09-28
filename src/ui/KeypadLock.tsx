import { useEffect, useId, useState } from 'react'
import { useStoryContext } from '../app/story-context'
import styles from './KeypadLock.module.css'
import { RichText } from './RichText'

interface KeypadLockProps {
  readonly label: string
  /** Number of dial positions; the answer must be exactly this many digits. */
  readonly length: number
  /** Text of the ink choice taken on submit; announced as the # key's action. */
  readonly submitLabel: string
  readonly onSubmit: (code: string) => void
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const

/**
 * Combination lock: digit dials on the left, phone-style keypad on the right.
 * Only digits can be entered, never more than `length`; # submits once every dial is set.
 * Physical keyboard works too: 0-9, Backspace, Enter or #.
 */
export function KeypadLock({ label, length, submitLabel, onSubmit }: KeypadLockProps) {
  const { strings } = useStoryContext()
  const [code, setCode] = useState('')
  const labelId = useId()
  const isComplete = code.length === length

  const pressDigit = (digit: string) => setCode((current) => (current.length < length ? current + digit : current))
  const eraseDigit = () => setCode((current) => current.slice(0, -1))
  const submit = () => {
    if (isComplete) onSubmit(code)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      if (/^[0-9]$/.test(event.key)) pressDigit(event.key)
      else if (event.key === 'Backspace') eraseDigit()
      else if (event.key === 'Enter' || event.key === '#') submit()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <section className={styles.lock} role="group" aria-labelledby={labelId} data-complete={isComplete || undefined}>
      <p id={labelId} className={styles.label}>
        <RichText text={label} />
      </p>

      <div className={styles.body}>
        <ol className={styles.dials} aria-hidden="true">
          {Array.from({ length }, (_, position) => (
            <li
              key={position}
              className={styles.dial}
              data-filled={position < code.length || undefined}
              data-current={position === code.length || undefined}
            >
              {code[position] ?? ''}
            </li>
          ))}
        </ol>

        <div className={styles.pad}>
          {DIGIT_ROWS.flat().map((digit) => (
            <DigitKey key={digit} digit={digit} isDisabled={isComplete} onPress={pressDigit} />
          ))}
          <button
            type="button"
            className={`${styles.key} ${styles.keyMuted}`}
            aria-label={strings.keypadDelete}
            aria-disabled={code.length === 0}
            onClick={eraseDigit}
          >
            ⌫
          </button>
          <DigitKey digit="0" isDisabled={isComplete} onPress={pressDigit} />
          <button
            type="button"
            className={`${styles.key} ${styles.keyEnter}`}
            aria-label={strings.keypadEnter(submitLabel)}
            aria-disabled={!isComplete}
            onClick={submit}
          >
            #
          </button>
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite">
        {strings.keypadStatus(code, length)}
      </p>
    </section>
  )
}

interface DigitKeyProps {
  readonly digit: string
  readonly isDisabled: boolean
  readonly onPress: (digit: string) => void
}

// aria-disabled (not disabled) keeps focus on the key when the last dial fills.
function DigitKey({ digit, isDisabled, onPress }: DigitKeyProps) {
  return (
    <button type="button" className={styles.key} aria-disabled={isDisabled} onClick={() => onPress(digit)}>
      {digit}
    </button>
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}
