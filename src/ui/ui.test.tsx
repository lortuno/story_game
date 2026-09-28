import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { StoryContext } from '../app/story-context'
import { plainText } from '../engine/markup'
import { getStrings } from '../i18n/strings'
import { testStory } from '../test/fixtures'
import { formatDuration, formatStoryDate } from './format'
import { PageView } from './PageView'
import { PlayClock } from './PlayClock'
import { RichText } from './RichText'
import { StoryDate } from './StoryDate'
import { StoryFigure } from './StoryFigure'

const wrap = (node: ReactNode) =>
  render(<StoryContext value={{ story: testStory, strings: getStrings('es') }}>{node}</StoryContext>)

describe('RichText', () => {
  it('links only to allow-listed keys, in a new tab', () => {
    const text = 'Lee los docs y esto.'
    wrap(
      <RichText
        text={{
          text,
          marks: [
            { kind: 'link', start: 4, end: 12, key: 'docs' },
            { kind: 'link', start: 15, end: 19, key: 'unknown' },
          ],
        }}
      />,
    )
    const link = screen.getByRole('link', { name: /los docs/ })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('esto')).toBeInTheDocument()
  })

  it('toggles tooltips with click and closes them with Escape', async () => {
    const user = userEvent.setup()
    wrap(<RichText text={{ text: 'Hay que echar.', marks: [{ kind: 'tip', start: 8, end: 13, tip: 'Multiplicar' }] }} />)
    const trigger = screen.getByRole('button', { name: 'echar' })
    expect(trigger).toHaveAccessibleDescription('Multiplicar')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders bold anywhere, including inside a tip, and drops overlapping interactive marks', () => {
    wrap(
      <RichText
        text={{
          text: 'Un acertijo clave',
          marks: [
            { kind: 'bold', start: 0, end: 2 },
            { kind: 'tip', start: 3, end: 11, tip: 'Pista' },
            { kind: 'bold', start: 3, end: 7 },
            { kind: 'link', start: 5, end: 17, key: 'docs' },
          ],
        }}
      />,
    )
    expect(screen.getByText('Un').tagName).toBe('STRONG')
    expect(screen.getByRole('button', { name: 'acertijo' }).querySelector('strong')).toHaveTextContent('acer')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows HTML in story text literally', () => {
    const { container } = wrap(<RichText text={{ text: '<img src=x onerror=alert(1)>', marks: [] }} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)>')
  })
})

describe('StoryFigure', () => {
  it('renders known images lazily with dimensions and skips unknown keys', () => {
    wrap(<StoryFigure images={[{ key: 'hall', caption: 'El vestíbulo' }, { key: 'missing', caption: null }]} />)
    const image = screen.getByRole('img', { name: 'El vestíbulo' })
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width', '800')
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('opens and closes a lightbox', async () => {
    const user = userEvent.setup()
    wrap(<StoryFigure images={[{ key: 'hall', caption: 'El vestíbulo' }]} />)
    await user.click(screen.getByRole('button', { name: 'Ampliar imagen: El vestíbulo' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when no image is known', () => {
    const { container } = wrap(<StoryFigure images={[{ key: 'nope', caption: null }]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('PageView', () => {
  it('renders every block kind', () => {
    wrap(
      <PageView
        blocks={[
          { kind: 'heading', level: 3, text: plainText('Nota') },
          { kind: 'group', style: 'postit', items: [plainText('ldrcc 5')] },
          { kind: 'group', style: 'olist', items: [plainText('uno'), plainText('dos')] },
          { kind: 'group', style: 'list', items: [plainText('tres')] },
          { kind: 'paragraph', text: plainText('Fin.'), speaker: null },
          { kind: 'paragraph', text: plainText('¿Atascados?'), speaker: 'Tina' },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Nota' })).toBeInTheDocument()
    expect(screen.getByText('ldrcc 5')).toBeInTheDocument()
    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText('Tina:')).toBeInTheDocument()
  })
})

describe('PlayClock', () => {
  it('shows stopped time against the limit and flags overtime', () => {
    wrap(<PlayClock playtimeMs={11 * 60_000} resumedAt={null} limitMinutes={10} />)
    const clock = screen.getByRole('timer')
    expect(clock).toHaveTextContent('11:00 / 10:00')
    expect(clock).toHaveAttribute('data-over')
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [83_000, '1:23'],
    [3_723_000, '1:02:03'],
    [-5, '0:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })
})

describe('StoryDate', () => {
  it('shows the in-world date in the story language with a machine-readable value', () => {
    wrap(<StoryDate iso="2020-04-23" lang="es" />)
    const date = screen.getByText('23/04/2020')
    expect(date.closest('time')).toHaveAttribute('datetime', '2020-04-23')
    expect(screen.getByText(/Fecha del caso/)).toBeInTheDocument()
  })

  it('falls back to the raw value when the date is invalid', () => {
    expect(formatStoryDate('pronto', 'es')).toBe('pronto')
  })
})
