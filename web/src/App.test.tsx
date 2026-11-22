import { screen } from '@testing-library/react'
import { abrir, prepararNavegadorFalso } from './test/renderizar'

beforeAll(prepararNavegadorFalso)

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

  it('manda para o login quem tenta abrir a área do aluno sem entrar', () => {
    abrir('/aguardando')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Entrar')
  })

  it('manda para o login quem tenta abrir o painel do professor sem entrar', () => {
    abrir('/professor')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Entrar')
  })
})
