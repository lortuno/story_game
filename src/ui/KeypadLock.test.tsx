import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StoryContext } from '../app/story-context'
import { plainText } from '../engine/markup'
import { testContext } from '../test/fixtures'
import { KeypadLock } from './KeypadLock'

function renderLock(onSubmit = vi.fn()) {
  render(
    <StoryContext value={testContext}>
      <KeypadLock label={plainText('Combinación del keypad:')} length={4} submitLabel="Probar la combinación" onSubmit={onSubmit} />
    </StoryContext>,
  )
  return onSubmit
}

const key = (name: string) => screen.getByRole('button', { name })
const dials = () => screen.getAllByRole('listitem', { hidden: true }).map((dial) => dial.textContent)
const enter = () => key('Almohadilla: Probar la combinación')

describe('KeypadLock', () => {
  it('renders the four dials, digits 0-9, delete and # inside a labelled group', () => {
    renderLock()
    expect(screen.getByRole('group', { name: 'Combinación del keypad:' })).toBeInTheDocument()
    expect(dials()).toEqual(['', '', '', ''])
    for (const digit of '0123456789') expect(key(digit)).toBeInTheDocument()
    expect(key('Borrar último dígito')).toHaveAttribute('aria-disabled', 'true')
    expect(enter()).toHaveAttribute('aria-disabled', 'true')
  })

  it('fills the dials in order, stops at four digits and submits with #', async () => {
    const user = userEvent.setup()
    const onSubmit = renderLock()

    await user.click(enter())
    expect(onSubmit).not.toHaveBeenCalled()

    for (const digit of '04267') await user.click(key(digit))
    expect(dials()).toEqual(['0', '4', '2', '6'])
    expect(key('7')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Combinación 0 4 2 6\. Pulsa almohadilla/)).toBeInTheDocument()

    await user.click(enter())
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('0426')
  })

  it('deletes the last digit', async () => {
    const user = userEvent.setup()
    renderLock()
    await user.click(key('1'))
    await user.click(key('2'))
    await user.click(key('Borrar último dígito'))
    expect(dials()).toEqual(['1', '', '', ''])
    expect(screen.getByText('Combinación 1. Faltan 3 dígitos.')).toBeInTheDocument()
  })

  it('accepts only digits from the physical keyboard; Backspace deletes, Enter and # submit', async () => {
    const user = userEvent.setup()
    const onSubmit = renderLock()

    await user.keyboard('0a4-x2 6')
    expect(dials()).toEqual(['0', '4', '2', '6'])
    await user.keyboard('{Backspace}9{Enter}')
    expect(onSubmit).toHaveBeenLastCalledWith('0429')
    await user.keyboard('#')
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('ignores keys typed into other form fields', async () => {
    const user = userEvent.setup()
    renderLock()
    const other = document.createElement('input')
    document.body.append(other)
    other.focus()
    await user.keyboard('12')
    expect(dials()).toEqual(['', '', '', ''])
    other.remove()
  })
})
