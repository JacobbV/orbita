import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router'
import { App } from '../App'
import { AuthContext, type EstadoAuth } from '../auth/AuthContext'
import { liberarTudo } from '../lib/ponte'
import { prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'
import { ModoNinjaContext } from './ModoNinja'

// Dados inventados; o banco é trocado por versões falsas.
const falso = vi.hoisted(() => ({ ninjaSalvo: [] as unknown[], sair: 0 }))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/avatar', async (original) => {
  const real = await original<typeof import('../lib/avatar')>()
  return {
    ...real,
    carregarAvatar: async (_id: string, papel: 'aluno' | 'professor') => real.avatarPadrao(papel),
    carregarAvatarNinja: async () => (await import('../arte/avatar')).PADRAO_NINJA,
    salvarAvatarNinja: async (e: unknown) => {
      falso.ninjaSalvo.push(e)
    },
  }
})

vi.mock('../lib/medalhas', async (original) => ({
  ...(await original<typeof import('../lib/medalhas')>()),
  carregarMedalhas: async () => [
    { codigo: 'primeira-aula', nome: 'Primeira Aula', descricao: 'Abriu a primeira aula.', ganhaEm: null },
    { codigo: 'estilista', nome: 'Estilista Espacial', descricao: 'Montou o boneco.', ganhaEm: null },
  ],
}))

const PROFESSOR: EstadoAuth = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' },
}

function abrirNinja(rota: string) {
  return render(
    <AuthContext.Provider value={PROFESSOR}>
      <ModoNinjaContext.Provider value={{ ativo: true, entrar: () => {}, sair: () => (falso.sair += 1) }}>
        <MemoryRouter initialEntries={[rota]}>
          <App />
        </MemoryRouter>
      </ModoNinjaContext.Provider>
    </AuthContext.Provider>,
  )
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.ninjaSalvo = []
  falso.sair = 0
})

describe('Modo Ninja', () => {
  it('Hangar do ninja mostra as peças do ninja e todas as outras, sem cadeado', async () => {
    abrirNinja('/hangar')
    expect(await screen.findByRole('heading', { name: 'Monte o seu ninja' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Acessórios' }))
    expect(screen.getByRole('button', { name: /Faixa ninja/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Capacete espacial/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Corpo e mãos' }))
    expect(screen.getByRole('button', { name: /Caneca de café/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: /Estrela ninja/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar ninja' }))
    expect(await screen.findByText('Ninja salvo!')).toBeInTheDocument()
    expect(falso.ninjaSalvo).toEqual([expect.objectContaining({ 'acessorio-corpo': 'acessorio-estrela-ninja' })])
    // O ninja não sorteia apelido: o apelido é do professor.
    expect(screen.queryByRole('region', { name: /apelido/i })).toBeNull()
  })

  it('medalhas ficam todas acesas e a faixa permite sair do modo', async () => {
    abrirNinja('/medalhas')
    expect(await screen.findByRole('heading', { name: 'Todas as medalhas' })).toBeInTheDocument()
    expect(screen.getAllByText('Acesa no Modo Ninja')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Sair do modo Ninja' }))
    expect(falso.sair).toBe(1)
  })

  it('libera todas as aulas de cada oferta, só da disciplina dela', () => {
    const unidades = [
      { id: 1, numero: 1, titulo: 'U1', disciplina_id: 10, aulas: [{ id: 101, numero: 1, titulo: 'A' }, { id: 102, numero: 2, titulo: 'B' }] },
      { id: 2, numero: 1, titulo: 'U1', disciplina_id: 20, aulas: [{ id: 201, numero: 1, titulo: 'C' }] },
    ]
    const ofertas = [
      { id: 7, disciplina: { id: 10, nome: 'X', sigla: 'X' } },
      { id: 8, disciplina: { id: 20, nome: 'Y', sigla: 'Y' } },
    ]
    expect(liberarTudo(ofertas as never, unidades)).toEqual([
      { aula_id: 101, turma_disciplina_id: 7, liberado_em: '' },
      { aula_id: 102, turma_disciplina_id: 7, liberado_em: '' },
      { aula_id: 201, turma_disciplina_id: 8, liberado_em: '' },
    ])
  })
})
