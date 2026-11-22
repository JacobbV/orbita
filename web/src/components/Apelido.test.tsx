import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthContext, type EstadoAuth } from '../auth/AuthContext'
import { SEM_LOGIN } from '../test/renderizar'
import { EscolherApelido } from './Apelido'

// Dados inventados; o banco é trocado por versões falsas.
const falso = vi.hoisted(() => ({ sorteios: ['Cometa Veloz', 'Estrela Curiosa'], escolhido: [] as string[], recarregou: 0 }))

vi.mock('../lib/apelidos', () => ({
  sortearApelido: async () => falso.sorteios.shift() ?? 'Nebulosa Serena',
  escolherApelido: async (a: string) => {
    falso.escolhido.push(a)
    return a
  },
}))

function abrir(apelido: string | null) {
  const auth: EstadoAuth = {
    ...SEM_LOGIN,
    perfil: { id: 'a1', nome: 'Aluna Fictícia', email: 'a@academico.ifpb.edu.br', papel: 'aluno', apelido },
    recarregarPerfil: async () => {
      falso.recarregou += 1
    },
  }
  return render(
    <AuthContext.Provider value={auth}>
      <EscolherApelido />
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  falso.sorteios = ['Cometa Veloz', 'Estrela Curiosa']
  falso.escolhido = []
  falso.recarregou = 0
})

describe('EscolherApelido', () => {
  it('sem campo de texto: só sortear e usar o sorteado', async () => {
    abrir(null)
    expect(screen.queryByRole('textbox')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Sortear apelido' }))
    expect(await screen.findByText('Cometa Veloz')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sortear de novo' }))
    expect(await screen.findByText('Estrela Curiosa')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Usar este' }))
    expect(await screen.findByText('Apelido salvo!')).toBeInTheDocument()
    expect(falso.escolhido).toEqual(['Estrela Curiosa'])
    expect(falso.recarregou).toBe(1)
  })

  it('quem já tem apelido pode sortear outro e manter o atual', async () => {
    abrir('Quasar Gentil')
    expect(screen.getByText('Quasar Gentil')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sortear outro' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Manter Quasar Gentil' }))
    expect(screen.getByText('Quasar Gentil')).toBeInTheDocument()
    expect(falso.escolhido).toEqual([])
  })
})
