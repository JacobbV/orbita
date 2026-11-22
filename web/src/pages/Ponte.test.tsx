import { screen, within } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import type { DadosDaPonte } from '../lib/ponte'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'

// Banco falso: a ponte recebe dados prontos, sem falar com o Supabase.
// O falso devolve os dados ou um erro; a rejeição acontece fora do vi.fn,
// que não lida bem com promessas rejeitadas.
const carregarPonte = vi.fn<() => Promise<DadosDaPonte | Error>>()

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

function dadosComUmaAulaLiberada(): DadosDaPonte {
  const liberada = {
    id: 11,
    numero: 1,
    titulo: 'O que é um algoritmo?',
    liberada: true,
    liberadaEm: '2026-11-02T10:00:00Z',
    materiais: [{ id: 1, tipo: 'slide', titulo: '', url: 'https://exemplo.org/slides' }],
  }
  const bloqueada = {
    id: 12,
    numero: 2,
    titulo: 'Do algoritmo ao programa',
    liberada: false,
    liberadaEm: null,
    materiais: [],
  }
  const unidade = { id: 1, numero: 1, titulo: 'Primeiros passos', aulas: [liberada, bloqueada], liberadas: 1 }
  return {
    temOutrosPedidos: false,
    disciplinas: [
      {
        oferta: OFERTA,
        unidades: [unidade, { id: 2, numero: 2, titulo: 'Decisões', aulas: [], liberadas: 0 }],
        totalAulas: 2,
        totalLiberadas: 1,
        ultimaLiberada: { unidade, aula: liberada },
      },
    ],
  }
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => carregarPonte.mockReset())

describe('Ponte de comando', () => {
  it('mostra o nome, a turma e o progresso da disciplina', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Olá, Tripulante.' })).toBeInTheDocument()
    expect(screen.getByText('Tripulante Fictício')).toBeInTheDocument()
    expect(screen.getByText('1º INFO M · manhã · 2026')).toBeInTheDocument()
    expect(screen.getByText(/1 de 2 aulas liberadas/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  })

  it('aula liberada tem o link do material, que abre em outra aba', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const item = (await screen.findAllByText('O que é um algoritmo?')).at(-1)?.closest('li')
    expect(item).toBeTruthy()
    const link = within(item as HTMLElement).getByRole('link', { name: /Abrir slides/ })
    expect(link).toHaveAttribute('href', 'https://exemplo.org/slides')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('aula bloqueada mostra o cadeado e nenhum conteúdo', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const item = (await screen.findByText('Do algoritmo ao programa')).closest('li') as HTMLElement
    expect(within(item).getByText('Bloqueada')).toBeInTheDocument()
    expect(within(item).queryByRole('link')).toBeNull()
  })

  it('destaca a última aula liberada e avisa unidade sem aulas', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    expect(await screen.findByText('Última aula liberada')).toBeInTheDocument()
    expect(screen.getByText(/Unidade I · Aula 1 — O que é um algoritmo\?/)).toBeInTheDocument()
    expect(screen.getByText('Aulas em breve.')).toBeInTheDocument()
  })

  it('sem nenhuma aula liberada, explica que o professor ainda vai liberar', async () => {
    const dados = dadosComUmaAulaLiberada()
    const d = dados.disciplinas[0]!
    const unidade = { ...d.unidades[0]!, liberadas: 0, aulas: d.unidades[0]!.aulas.map((a) => ({ ...a, liberada: false, liberadaEm: null, materiais: [] })) }
    dados.disciplinas[0] = { ...d, unidades: [unidade], totalLiberadas: 0, ultimaLiberada: null }
    carregarPonte.mockResolvedValue(dados)
    abrir('/ponte', ALUNO)
    expect(await screen.findByText(/ainda não liberou nenhuma aula/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir/ })).toBeNull()
  })

  it('aluno sem disciplina aprovada vai para os pedidos', async () => {
    carregarPonte.mockResolvedValue({ disciplinas: [], temOutrosPedidos: true })
    abrir('/ponte', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Olá, Tripulante.' })).toBeInTheDocument()
    expect(await screen.findByText('Seus pedidos')).toBeInTheDocument()
  })

  it('mostra o erro em português quando o banco falha', async () => {
    carregarPonte.mockResolvedValue(new Error('Failed to fetch'))
    abrir('/ponte', ALUNO)
    expect(await screen.findByText('Não foi possível abrir a ponte de comando')).toBeInTheDocument()
    expect(screen.getByText(/Sem conexão com o servidor/)).toBeInTheDocument()
  })

  it('quem não entrou vai para o login', async () => {
    abrir('/ponte')
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(carregarPonte).not.toHaveBeenCalled()
  })
})
