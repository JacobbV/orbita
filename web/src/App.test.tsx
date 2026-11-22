import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from './App'

// jsdom não desenha canvas; o fundo de estrelas só precisa não quebrar.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

function abrir(rota: string) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  )
}

describe('páginas públicas', () => {
  it('mostra o início com as três disciplinas', () => {
    abrir('/')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Estude programação')
    expect(screen.getByText('Algoritmos e Lógica de Programação')).toBeInTheDocument()
    expect(screen.getByText('Fundamentos do Computador')).toBeInTheDocument()
    expect(screen.getByText('Desenvolvimento de Aplicações Web')).toBeInTheDocument()
  })

  it('tem o rodapé QYUDEV. com link para jacobbv.github.io', () => {
    abrir('/')
    const link = screen.getByRole('link', { name: 'QYUDEV.' })
    expect(link).toHaveAttribute('href', 'https://jacobbv.github.io')
  })

  it('lista as fontes com licença na página de créditos', () => {
    abrir('/creditos')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Créditos e licenças')
    for (const fonte of ['Inter', 'JetBrains Mono', 'Press Start 2P']) {
      expect(screen.getByRole('link', { name: fonte })).toBeInTheDocument()
    }
  })

  it('mostra a página 404 para endereço desconhecido', () => {
    abrir('/nao-existe')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('não existe')
  })
})
