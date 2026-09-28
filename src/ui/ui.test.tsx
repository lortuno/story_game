import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { StoryContext } from '../app/story-context'
import { getStrings } from '../i18n/strings'
import { testStory } from '../test/fixtures'
import { formatDuration } from './format'
import { PageView } from './PageView'
import { PlayClock } from './PlayClock'
import { RichText } from './RichText'
import { StoryFigure } from './StoryFigure'

const wrap = (node: ReactNode) =>
  render(<StoryContext value={{ story: testStory, strings: getStrings('es') }}>{node}</StoryContext>)

describe('RichText', () => {
  it('links only to allow-listed keys, in a new tab', () => {
    wrap(<RichText text="Lee [los docs](docs) y [esto](https://evil.example)." />)
    const link = screen.getByRole('link', { name: /los docs/ })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText(/esto/)).toBeInTheDocument()
  })

  it('toggles tooltips with click and closes them with Escape', async () => {
    const user = userEvent.setup()
    wrap(<RichText text="Hay que [echar](?Multiplicar)." />)
    const trigger = screen.getByRole('button', { name: 'echar' })
    expect(trigger).toHaveAccessibleDescription('Multiplicar')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
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
          { kind: 'heading', level: 3, text: 'Nota' },
          { kind: 'group', style: 'postit', items: ['ldrcc 5'] },
          { kind: 'group', style: 'olist', items: ['uno', 'dos'] },
          { kind: 'group', style: 'list', items: ['tres'] },
          { kind: 'paragraph', text: 'Fin.' },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Nota' })).toBeInTheDocument()
    expect(screen.getByText('ldrcc 5')).toBeInTheDocument()
    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
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
