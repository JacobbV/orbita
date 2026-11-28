import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'
import type { LinhaDoProfessor } from '../../lib/ranking'

const falso = vi.hoisted(() => ({ linhas: [] as unknown[], turma: 0, tirados: [] as string[] }))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../../lib/ranking', async (original) => ({
  ...(await original<typeof import('../../lib/ranking')>()),
  carregarRankingDoProfessor: async (turma: number) => {
    falso.turma = turma
    return falso.linhas
  },
  tirarDoRanking: async (id: string) => {
    falso.tirados.push(id)
    falso.linhas = (falso.linhas as LinhaDoProfessor[]).filter((l) => l.alunoId !== id)
  },
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.turma = 0
  falso.tirados = []
  falso.linhas = [
    { alunoId: 'a1', nome: 'Andrômeda Vega', apelido: 'Cometa Curioso', posicao: 1, xp: 40, patente: 'Cadete', entrouEm: '2026-11-20T10:00:00Z' },
    { alunoId: 'a2', nome: 'Sírius Altair', apelido: 'Estrela Veloz', posicao: 2, xp: 10, patente: 'Cadete', entrouEm: '2026-11-21T10:00:00Z' },
  ]
})

describe('Ranking da turma (professor)', () => {
  it('mostra o apelido e o nome real de quem entrou', async () => {
    abrir('/professor/ranking/5', PROFESSOR)
    const lista = await screen.findByRole('list', { name: 'Participantes do ranking' })
    expect(falso.turma).toBe(5)
    expect(within(lista).getByText('Cometa Curioso')).toBeInTheDocument()
    expect(within(lista).getByText(/Andrômeda Vega · Cadete/)).toBeInTheDocument()
  })

  it('tira um aluno do ranking', async () => {
    abrir('/professor/ranking/5', PROFESSOR)
    await userEvent.click(await screen.findByRole('button', { name: /Tirar do ranking.*Sírius Altair/ }))
    expect(await screen.findByText(/Sírius Altair saiu do ranking/)).toBeInTheDocument()
    expect(falso.tirados).toEqual(['a2'])
    expect(screen.queryByText('Estrela Veloz')).not.toBeInTheDocument()
  })

  it('aluno não abre a tela do professor', async () => {
    abrir('/professor/ranking/5', { ...PROFESSOR, perfil: { ...PROFESSOR.perfil, papel: 'aluno' as const } })
    expect(screen.queryByRole('heading', { name: 'Ranking da turma' })).not.toBeInTheDocument()
  })
})
