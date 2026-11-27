import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { PADRAO_ALUNO } from '../../arte/avatar'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'

// Dados inventados.
const falso = vi.hoisted(() => ({ perfilPedido: '' }))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  buscarOferta: async (id: number) => ({
    id,
    turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
    disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
  }),
}))

vi.mock('../../lib/tripulacao', () => ({
  carregarTripulacao: async () => [
    { alunoId: 'a1', nome: 'Andrômeda Vega', apelido: 'Cometa Veloz', xp: 175, patente: 'Piloto', escolhas: PADRAO_ALUNO },
    { alunoId: 'a2', nome: 'Sírius Altair', apelido: null, xp: 30, patente: 'Cadete', escolhas: PADRAO_ALUNO },
  ],
  carregarPerfilDoAluno: async (id: string) => {
    falso.perfilPedido = id
    return {
      medalhas: [
        { codigo: 'primeira-aula', nome: 'Primeira Aula', descricao: 'Abriu a primeira aula.', ganhaEm: '2026-11-20T10:00:00Z' },
        { codigo: 'maratonista', nome: 'Maratonista', descricao: 'Cinco dias seguidos.', ganhaEm: null },
      ],
      entregas: [
        { id: 1, exercicio: 'Média da turma', nota: 8.5, situacao: 'a_confirmar', corrigida: true, devolvida: false, criadoEm: '2026-11-27T13:00:00Z' },
      ],
    }
  },
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

beforeAll(prepararNavegadorFalso)

describe('Tripulação da turma', () => {
  it('mostra um cartão por aluno, com apelido, patente e XP', async () => {
    abrir('/professor/tripulacao/11', PROFESSOR)
    expect(await screen.findByRole('heading', { name: '1º INFO M · ALG' })).toBeInTheDocument()
    const grade = screen.getByRole('list', { name: 'Tripulantes da turma' })
    const vega = within(grade).getByRole('button', { name: 'Perfil de Andrômeda Vega' })
    expect(vega).toHaveTextContent('Cometa Veloz')
    expect(vega).toHaveTextContent('Piloto · 175 XP')
    expect(within(grade).getAllByRole('button')).toHaveLength(2)
  })

  it('clicar no aluno abre o perfil com medalhas ganhas e últimas entregas', async () => {
    const u = userEvent.setup()
    abrir('/professor/tripulacao/11', PROFESSOR)
    await u.click(await screen.findByRole('button', { name: 'Perfil de Andrômeda Vega' }))
    const perfil = await screen.findByRole('region', { name: 'Perfil de Andrômeda Vega' })
    expect(await within(perfil).findByText('Medalhas (1 de 2)')).toBeInTheDocument()
    expect(falso.perfilPedido).toBe('a1')
    expect(within(perfil).getByRole('img', { name: 'Primeira Aula' })).toBeInTheDocument()
    expect(within(perfil).queryByRole('img', { name: 'Maratonista' })).toBeNull()
    expect(perfil).toHaveTextContent('Média da turma')
    expect(perfil).toHaveTextContent('nota 8,5')
    expect(perfil).toHaveTextContent('corrigida')
    expect(within(perfil).getByRole('link', { name: 'Dar XP' })).toHaveAttribute('href', '/professor/xp/11')
    expect(within(perfil).getByRole('link', { name: 'Ver entregas' })).toHaveAttribute('href', '/professor?aba=entregas&turma=11')
    await u.click(within(perfil).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('region', { name: 'Perfil de Andrômeda Vega' })).toBeNull()
  })
})
