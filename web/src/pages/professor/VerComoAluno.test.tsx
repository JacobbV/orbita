import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'

// Dados inventados.
const falso = vi.hoisted(() => ({ aberturas: [] as number[], ofertaPedida: 0 }))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

const OFERTA = {
  id: 11,
  turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
  disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
}

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  buscarOferta: async (id: number) => {
    falso.ofertaPedida = id
    return OFERTA
  },
}))

vi.mock('../../lib/progresso', async (original) => ({
  ...(await original<typeof import('../../lib/progresso')>()),
  registrarAberturaEmSilencio: (id: number) => falso.aberturas.push(id),
}))

vi.mock('../../lib/ponte', async (original) => {
  const real = await original<typeof import('../../lib/ponte')>()
  const aula = {
    id: 21,
    numero: 1,
    titulo: 'O que é um algoritmo?',
    liberada: true,
    liberadaEm: '2026-11-02T10:00:00Z',
    materiais: [
      { id: 3, tipo: 'slide' as const, titulo: 'Slides', url: null },
      { id: 4, tipo: 'link', titulo: 'Apostila', url: 'https://exemplo.org/apostila' },
    ],
    exercicios: [],
  }
  const unidade = { id: 1, numero: 1, titulo: 'Primeiros passos', aulas: [aula], liberadas: 1 }
  return {
    ...real,
    carregarPonteComoAluno: async () => ({ oferta: OFERTA, unidades: [unidade], totalAulas: 1, totalLiberadas: 1, ultimaLiberada: null }),
  }
})

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

beforeAll(prepararNavegadorFalso)

describe('Ver como aluno', () => {
  it('mostra a ponte da turma, só para ver, com os slides como o aluno vê', async () => {
    abrir('/professor/ver-como-aluno/11', PROFESSOR)
    expect(await screen.findByText('Vendo como aluno')).toBeInTheDocument()
    expect(falso.ofertaPedida).toBe(11)
    expect(screen.getByText(/nada muda e ninguém ganha XP/)).toBeInTheDocument()
    const item = screen.getByText('O que é um algoritmo?').closest('li') as HTMLElement
    expect(within(item).getByRole('link', { name: 'Abrir slides' })).toHaveAttribute('href', '/slides/3?comoAluno=1')
    await userEvent.click(within(item).getByRole('link', { name: /Apostila/ }))
    expect(falso.aberturas).toEqual([])
  })

  it('aluno não entra na visão do professor', async () => {
    abrir('/professor/ver-como-aluno/11', { ...PROFESSOR, perfil: { ...PROFESSOR.perfil, papel: 'aluno' as const } })
    expect(screen.queryByText('Vendo como aluno')).toBeNull()
  })
})
