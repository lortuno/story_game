import { useId, useState, type KeyboardEvent } from 'react'
import { useStoryContext } from '../app/story-context'
import { parseInline } from '../engine/markup'
import styles from './RichText.module.css'

interface RichTextProps {
  readonly text: string
}

/** Renders story markup as React nodes; never uses innerHTML. */
export function RichText({ text }: RichTextProps) {
  const { story, strings } = useStoryContext()

  return parseInline(text).map((token, index) => {
    switch (token.kind) {
      case 'text':
        return token.text
      case 'strong':
        return <strong key={index}>{token.text}</strong>
      case 'tip':
        return <Toggletip key={index} label={token.label} tip={token.tip} />
      case 'link': {
        const href = story.links[token.key]
        if (!href) return token.label // unknown key: show the label, never a raw URL
        return (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer">
            {token.label}
            <span className="visually-hidden"> {strings.opensInNewTab}</span>
          </a>
        )
      }
    }
  })
}

interface ToggletipProps {
  readonly label: string
  readonly tip: string
}

/** Hover or focus+click reveals the tip; works with touch and keyboard (Esc closes). */
function Toggletip({ label, tip }: ToggletipProps) {
  const [open, setOpen] = useState(false)
  const tipId = useId()

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <span className={styles.tip} data-open={open || undefined}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-describedby={tipId}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      >
        {label}
      </button>
      <span role="tooltip" id={tipId} className={styles.bubble}>
        {tip}
      </span>
    </span>
  )
}
