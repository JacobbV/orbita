import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../test/renderizar'
import type { LinhaDoRanking, SituacaoNoRanking } from '../lib/ranking'

// Dados inventados. Os falsos ficam fora do vi.fn (promessas rejeitadas).
const falso = vi.hoisted(() => ({
  situacao: { participando: false, temApelido: true, podeEntrar: true } as SituacaoNoRanking,
  linhas: [] as LinhaDoRanking[],
  periodos: [] as string[],
  chamadas: [] as string[],
}))

vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  meusPedidos: async () => [
    {
      id: 1,
      status: 'aprovado',
      tentativa: 1,
      motivoRecusa: null,
      quemEVoce: 'Vega Fictícia, 1º INFO M, manhã',
      criadoEm: '2026-11-01T00:00:00Z',
      oferta: {
        id: 11,
        turma: { id: 5, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
        disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos' },
      },
    },
  ],
}))

vi.mock('../lib/ranking', async (original) => ({
  ...(await original<typeof import('../lib/ranking')>()),
  minhaSituacaoNoRanking: async () => ({ ...falso.situacao }),
  entrarNoRanking: async () => {
    falso.chamadas.push('entrar')
    falso.situacao = { ...falso.situacao, participando: true }
  },
  sairDoRanking: async () => {
    falso.chamadas.push('sair')
    falso.situacao = { ...falso.situacao, participando: false }
  },
  carregarRanking: async (_turma: number, periodo: string) => {
    falso.periodos.push(periodo)
    return falso.linhas
  },
}))

const ALUNO = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'a1' } } as unknown as Session,
  perfil: { id: 'a1', nome: 'Vega Fictícia', email: 'vega@academico.ifpb.edu.br', papel: 'aluno' as const, apelido: 'Cometa Curioso' },
}

const linha = (posicao: number, apelido: string, xp: number, ehVoce = false): LinhaDoRanking => ({
  posicao,
  apelido,
  escolhas: {},
  patente: 'Cadete',
  xp,
  ehVoce,
})

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.situacao = { participando: false, temApelido: true, podeEntrar: true }
  falso.linhas = [linha(1, 'Estrela Veloz', 40), linha(2, 'Quasar Calmo', 25)]
  falso.periodos = []
  falso.chamadas = []
})

describe('Ranking', () => {
  it('quem não entrou vê o convite com o aviso de privacidade e a lista da turma', async () => {
    abrir('/ranking', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Ranking da tripulação' })).toBeInTheDocument()
    expect(screen.getByText(/Você não está no ranking/)).toBeInTheDocument()
    expect(screen.getByText(/Seu nome e seu e-mail nunca aparecem/)).toBeInTheDocument()
    const lista = await screen.findByRole('list', { name: 'Ranking semana' })
    expect(within(lista).getByText('Estrela Veloz')).toBeInTheDocument()
    expect(falso.periodos[0]).toBe('semana')
  })

  it('entra no ranking pelo botão e sai pedindo confirmação', async () => {
    abrir('/ranking', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: 'Entrar no ranking' }))
    expect(await screen.findByText(/Você está no ranking/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair do ranking' }))
    expect(falso.chamadas).toEqual(['entrar'])
    await userEvent.click(screen.getByRole('button', { name: 'Sim, sair do ranking' }))
    expect(await screen.findByText(/Você não está no ranking/)).toBeInTheDocument()
    expect(falso.chamadas).toEqual(['entrar', 'sair'])
  })

  it('sem apelido, leva ao sorteio e não oferece o botão de entrar', async () => {
    falso.situacao = { participando: false, temApelido: false, podeEntrar: true }
    abrir('/ranking', ALUNO)
    expect(await screen.findByRole('link', { name: 'Sortear apelido na ponte' })).toHaveAttribute('href', '/ponte')
    expect(screen.queryByRole('button', { name: 'Entrar no ranking' })).not.toBeInTheDocument()
  })

  it('mostra a própria posição numa linha separada quando está fora do top 10', async () => {
    falso.situacao = { participando: true, temApelido: true, podeEntrar: true }
    falso.linhas = [...Array.from({ length: 10 }, (_, i) => linha(i + 1, `Cometa ${i + 1}`, 100 - i)), linha(17, 'Cometa Curioso', 3, true)]
    abrir('/ranking', ALUNO)
    const lista = await screen.findByRole('list', { name: 'Ranking semana' })
    expect(within(lista).getAllByRole('listitem').filter((li) => li.className.includes('ranking-linha'))).toHaveLength(11)
    expect(within(lista).getByText('17º')).toBeInTheDocument()
    expect(within(lista).getByText(/\(você\)/)).toBeInTheDocument()
  })

  it('troca para a aba Geral', async () => {
    abrir('/ranking', ALUNO)
    await userEvent.click(await screen.findByRole('button', { name: 'Geral' }))
    await screen.findByRole('list', { name: 'Ranking geral' })
    expect(falso.periodos).toContain('geral')
  })

  it('o professor não abre a tela do aluno', async () => {
    abrir('/ranking', { ...ALUNO, perfil: { ...ALUNO.perfil, papel: 'professor' as const } })
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent('Ranking da tripulação')
  })
})
