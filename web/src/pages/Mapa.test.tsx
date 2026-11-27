import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import type { DadosDaPonte } from '../lib/ponte'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Banco falso: o mapa recebe dados prontos. Dados inventados.
const carregarPonte = vi.fn<() => Promise<DadosDaPonte | Error>>()
const estudo = vi.hoisted(() => ({ valor: { seguidos: 0, estudouHoje: false, ultimaAulaId: null as number | null } }))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/ponte', async (original) => ({
  ...(await original<typeof import('../lib/ponte')>()),
  carregarPonte: async () => {
    const r = await carregarPonte()
    if (r instanceof Error) throw r
    return r
  },
}))

vi.mock('../lib/progresso', async (original) => ({
  ...(await original<typeof import('../lib/progresso')>()),
  carregarEstudoRecente: async () => estudo.valor,
  carregarProgresso: async () => {
    throw new Error('sem progresso')
  },
}))

vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  meusPedidos: async () => [],
  listarOfertas: async () => [],
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Tripulante Fictício', email: 'tripulante@academico.ifpb.edu.br', papel: 'aluno' as const },
}

const OFERTA = {
  id: 11,
  turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
  disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
}

function aula(id: number, numero: number, titulo: string, liberada: boolean, interna = true) {
  return {
    id,
    numero,
    titulo,
    liberada,
    liberadaEm: liberada ? `2026-11-0${numero}T10:00:00Z` : null,
    materiais: liberada
      ? [interna ? { id: id * 10, tipo: 'slide' as const, titulo: 'Slides', url: null } : { id: id * 10, tipo: 'link', titulo: 'Apostila', url: 'https://exemplo.org/a' }]
      : [],
    exercicios: [],
  }
}

function dados(): DadosDaPonte {
  const a11 = aula(11, 1, 'O que é um algoritmo?', true)
  const a12 = aula(12, 2, 'Variáveis e tipos', true, false)
  const a21 = aula(21, 1, 'Valores lógicos', true)
  const a22 = aula(22, 2, 'A decisão if e else', false)
  const u1 = { id: 1, numero: 1, titulo: 'Primeiros passos', aulas: [a11, a12], liberadas: 2 }
  const u2 = { id: 2, numero: 2, titulo: 'Decisões', aulas: [a21, a22], liberadas: 1 }
  const u3 = { id: 3, numero: 3, titulo: 'Repetição', aulas: [aula(31, 1, 'O laço while', false)], liberadas: 0 }
  return {
    temOutrosPedidos: false,
    disciplinas: [{ oferta: OFERTA, unidades: [u1, u2, u3], totalAulas: 5, totalLiberadas: 3, ultimaLiberada: { unidade: u2, aula: a21 } }],
  }
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  carregarPonte.mockReset()
  estudo.valor = { seguidos: 0, estudouHoje: false, ultimaAulaId: null }
})

describe('Mapa da galáxia', () => {
  it('mostra um planeta por unidade e abre a unidade atual', async () => {
    carregarPonte.mockResolvedValue(dados())
    abrir('/mapa', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Mapa da galáxia' })).toBeInTheDocument()
    const galaxia = screen.getByRole('navigation', { name: 'Unidades da disciplina' })
    expect(within(galaxia).getAllByRole('button')).toHaveLength(3)
    // Sem histórico, a unidade atual é a da última aula liberada (II).
    expect(within(galaxia).getByRole('button', { name: /Decisões/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(galaxia).getByText(/Você está aqui/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Decisões' })).toBeInTheDocument()
  })

  it('tocar num planeta mostra as aulas dele, com cadeado nas bloqueadas', async () => {
    carregarPonte.mockResolvedValue(dados())
    abrir('/mapa', ALUNO)
    await screen.findByRole('heading', { name: 'Mapa da galáxia' })
    expect(screen.getByText('bloqueada')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Primeiros passos/ }))
    expect(screen.getByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir a aula 1: O que é um algoritmo\?/ })).toHaveAttribute('href', '/aula/11')
    const externo = screen.getByRole('link', { name: /Abrir a aula 2: Variáveis e tipos/ })
    expect(externo).toHaveAttribute('href', 'https://exemplo.org/a')
    expect(externo).toHaveAttribute('target', '_blank')
    expect(screen.queryByText('bloqueada')).toBeNull()
  })

  it('a aula da última abertura aparece como Continuar, na unidade dela', async () => {
    estudo.valor = { seguidos: 1, estudouHoje: true, ultimaAulaId: 11 }
    carregarPonte.mockResolvedValue(dados())
    abrir('/mapa', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continuar a aula 1/ })).toHaveAttribute('href', '/aula/11')
  })

  it('planeta sem aula liberada fica bloqueado e diz isso', async () => {
    carregarPonte.mockResolvedValue(dados())
    abrir('/mapa', ALUNO)
    await screen.findByRole('heading', { name: 'Mapa da galáxia' })
    expect(screen.getByRole('button', { name: /Repetição/ })).toHaveTextContent('nenhuma aula liberada')
  })

  it('sem disciplina aprovada, manda para a tela de pedidos', async () => {
    carregarPonte.mockResolvedValue({ temOutrosPedidos: true, disciplinas: [] })
    abrir('/mapa', ALUNO)
    expect(await screen.findByText('Aguardando aprovação')).toBeInTheDocument()
  })

  it('mostra o erro se o mapa não carregar', async () => {
    carregarPonte.mockResolvedValue(new Error('falhou'))
    abrir('/mapa', ALUNO)
    expect(await screen.findByText('Não foi possível abrir o mapa')).toBeInTheDocument()
  })
})
