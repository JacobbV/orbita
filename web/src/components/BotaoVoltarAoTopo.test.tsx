import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BotaoVoltarAoTopo } from './BotaoVoltarAoTopo'

describe('BotaoVoltarAoTopo', () => {
  it('só aparece depois de rolar e leva ao topo', async () => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    render(<BotaoVoltarAoTopo />)
    expect(screen.queryByRole('button', { name: /Voltar ao topo/ })).toBeNull()

    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    await userEvent.click(await screen.findByRole('button', { name: /Voltar ao topo/ }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
