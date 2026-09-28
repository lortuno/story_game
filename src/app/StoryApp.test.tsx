import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestServices, testStory } from '../test/fixtures'
import { StoryApp } from './StoryApp'

beforeEach(() => {
  // jsdom has no media playback; the audio manager must tolerate that.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

describe('StoryApp', () => {
  it('plays from the title screen to the ending', async () => {
    const user = userEvent.setup()
    const services = createTestServices()
    render(<StoryApp story={testStory} services={services} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mini')
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nueva partida' }))

    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()
    const date = screen.getByText('23/04/2020')
    expect(date.compareDocumentPosition(screen.getByRole('timer')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await user.click(screen.getByText('Ask a friend'))
    expect(services.received.map((event) => event.type)).toContain('hint.revealed')

    const field = screen.getByLabelText('Secret word:')
    expect(field).toHaveAttribute('type', 'password')
    await user.type(field, 'wrong')
    await user.click(screen.getByRole('button', { name: 'Try' }))
    expect(await screen.findByText('Nope.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await user.type(screen.getByLabelText('Secret word:'), 'Open Sesame')
    await user.click(screen.getByRole('button', { name: 'Try' }))
    expect(await screen.findByText('The door opens.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Left' }))
    expect(screen.getByRole('heading', { name: 'Caso cerrado' })).toBeInTheDocument()
    expect(screen.getByText(/1 fallo\b/)).toBeInTheDocument()
    expect(services.received.at(-1)?.type).toBe('story.ended')
  })

  it('returns to the menu and continues the saved game', async () => {
    const user = userEvent.setup()
    const services = createTestServices()
    render(<StoryApp story={testStory} services={services} />)

    await user.click(screen.getByRole('button', { name: 'Nueva partida' }))
    await user.type(screen.getByLabelText('Secret word:'), 'opensesame')
    await user.click(screen.getByRole('button', { name: 'Try' }))
    await user.click(screen.getByRole('button', { name: 'Menú' }))

    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('The door opens.')).toBeInTheDocument()
  })

  it('persists the mute preference', async () => {
    const user = userEvent.setup()
    render(<StoryApp story={testStory} services={createTestServices()} />)
    await user.click(screen.getByRole('button', { name: 'Nueva partida' }))

    const toggle = screen.getByRole('button', { name: 'Silenciar' })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Activar sonido' })).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('story-game:muted')).toBe('1')
  })

  it('shows the error state and lets the player go back', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<StoryApp story={testStory} services={createTestServices()} />)
    await user.click(screen.getByRole('button', { name: 'Nueva partida' }))
    await user.type(screen.getByLabelText('Secret word:'), 'opensesame')
    await user.click(screen.getByRole('button', { name: 'Try' }))
    await user.click(screen.getByRole('button', { name: 'Right' }))
    await user.type(screen.getByLabelText('Type anything:'), 'x')
    await user.click(screen.getByRole('button', { name: 'Go' }))

    expect(screen.getByRole('alert')).toHaveTextContent('undeclared_variable')
    await user.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(screen.getByText('Type anything:')).toBeInTheDocument()
  })
})
