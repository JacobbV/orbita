import { fireEvent, screen, within } from '@testing-library/react'
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

// Progresso falso: null = o banco falhou (a ponte abre mesmo assim).
const progressoFalso = vi.hoisted(() => ({ valor: null as unknown, aberturas: [] as number[], estudo: null as unknown }))

vi.mock('../lib/progresso', async (original) => {
  const real = await original<typeof import('../lib/progresso')>()
  return {
    ...real,
    carregarProgresso: async () => {
      if (!progressoFalso.valor) throw new Error('sem progresso')
      return progressoFalso.valor
    },
    carregarEstudoRecente: async () => {
      if (!progressoFalso.estudo) throw new Error('sem estudo')
      return progressoFalso.estudo
    },
    registrarAberturaEmSilencio: (aulaId: number) => {
      progressoFalso.aberturas.push(aulaId)
      real.anunciarConquista({ xp: 10, ganhos: [{ quantidade: 10, descricao: 'Primeira vez nesta aula' }], medalhas: [], novaPatente: null })
    },
  }
})

// Professor da nave falso: null = não carregou (o cartão não aparece).
const professorFalso = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('../lib/avatar', async (original) => ({
  ...(await original<typeof import('../lib/avatar')>()),
  carregarProfessorDaNave: async () => professorFalso.valor,
}))

// Medalhas falsas: null = o banco falhou (só o atalho aparece).
const medalhasFalsas = vi.hoisted(() => ({ valor: null as unknown }))

vi.mock('../lib/medalhas', async (original) => ({
  ...(await original<typeof import('../lib/medalhas')>()),
  carregarMedalhas: async () => {
    if (!medalhasFalsas.valor) throw new Error('sem medalhas')
    return medalhasFalsas.valor
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
    materiais: [
      { id: 2, tipo: 'slide' as const, titulo: 'Slides da aula', url: null },
      { id: 1, tipo: 'link', titulo: 'Apostila', url: 'https://exemplo.org/apostila' },
    ],
    exercicios: [{ id: 5, titulo: 'Soma de dois números', dificuldade: 2 }],
  }
  const bloqueada = {
    id: 12,
    numero: 2,
    titulo: 'Do algoritmo ao programa',
    liberada: false,
    liberadaEm: null,
    materiais: [],
    exercicios: [],
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
  beforeEach(() => {
    progressoFalso.valor = null
    progressoFalso.aberturas = []
    progressoFalso.estudo = null
    professorFalso.valor = null
    medalhasFalsas.valor = null
  })

  it('mostra Continuar aula, atividades abertas e os dias seguidos', async () => {
    progressoFalso.estudo = { seguidos: 4, estudouHoje: true, ultimaAulaId: 11 }
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const continuar = await screen.findByRole('link', { name: 'Continuar aula' })
    expect(continuar).toHaveAttribute('href', '/aula/11')
    const abertas = screen.getByRole('heading', { name: 'Atividades abertas' }).closest('div') as HTMLElement
    expect(within(abertas).getByRole('link', { name: /Soma de dois números/ })).toHaveAttribute('href', '/exercicio/5')
    expect(await screen.findByText('dias seguidos estudando')).toBeInTheDocument()
    expect(screen.getByText(/Hoje já conta/)).toBeInTheDocument()
  })

  it('sem histórico de estudo, convida a começar a aula e esconde os dias seguidos se o banco falhar', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    expect(await screen.findByRole('link', { name: 'Começar aula' })).toHaveAttribute('href', '/aula/11')
    expect(screen.queryByText(/dias? seguidos? estudando/)).toBeNull()
  })

  it('mostra as últimas medalhas ganhas e o atalho para todas', async () => {
    progressoFalso.valor = { xp: 175, nivel: 2, patente: 'Piloto', xpDaPatente: 100, proxima: 'Navegador', xpDaProxima: 250 }
    medalhasFalsas.valor = [
      { codigo: 'primeira-aula', nome: 'Primeira Aula', descricao: '', ganhaEm: '2026-11-20T13:00:00Z' },
      { codigo: 'maratonista', nome: 'Maratonista', descricao: '', ganhaEm: null },
      { codigo: 'destaque', nome: 'Destaque da Aula', descricao: '', ganhaEm: '2026-11-21T13:00:00Z' },
    ]
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const lista = await screen.findByRole('list', { name: 'Últimas medalhas' })
    expect(within(lista).getAllByRole('img').map((i) => i.getAttribute('aria-label'))).toEqual(['Destaque da Aula', 'Primeira Aula'])
    expect(screen.getByRole('link', { name: 'Medalhas: 2 de 3' })).toHaveAttribute('href', '/medalhas')
  })

  it('mostra o boneco e o nome do professor da nave', async () => {
    const { PADRAO_PROFESSOR } = await import('../arte/avatar')
    professorFalso.valor = { nome: 'Prof. Fictício', escolhas: PADRAO_PROFESSOR }
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const cartao = await screen.findByRole('complementary', { name: 'Seu professor' })
    expect(within(cartao).getByText('Prof. Fictício')).toBeInTheDocument()
    expect(within(cartao).getByText('Comandante da nave')).toBeInTheDocument()
  })

  it('sem o professor carregado, a ponte abre sem o cartão', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    expect(await screen.findByText('Última aula liberada')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Seu professor' })).toBeNull()
  })

  it('mostra a patente, o XP e quanto falta para a próxima', async () => {
    progressoFalso.valor = { xp: 175, nivel: 2, patente: 'Piloto', xpDaPatente: 100, proxima: 'Navegador', xpDaProxima: 250 }
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    expect(await screen.findByText('Piloto')).toBeInTheDocument()
    expect(screen.getByText('175 XP')).toBeInTheDocument()
    expect(screen.getByText('Faltam 75 XP para Navegador.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'XP até a patente Navegador' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('abrir o link externo da aula registra a abertura e mostra o XP ganho', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const item = (await screen.findAllByText('O que é um algoritmo?')).at(-1)?.closest('li')
    fireEvent.click(within(item as HTMLElement).getByRole('link', { name: /Apostila/ }))
    expect(await screen.findByText('+10 XP · Primeira vez nesta aula')).toBeInTheDocument()
    expect(progressoFalso.aberturas).toEqual([11])
  })

  it('mostra o nome, a turma e o progresso da disciplina', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    expect(await screen.findByRole('heading', { name: 'Olá, Tripulante.' })).toBeInTheDocument()
    expect(screen.getByText('Tripulante Fictício')).toBeInTheDocument()
    expect(screen.getByText('1º INFO M · manhã · 2026')).toBeInTheDocument()
    expect(screen.getByText(/1 de 2 aulas liberadas/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  })

  it('aula liberada tem a página da aula do Órbita e o link externo, que abre em outra aba', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const item = (await screen.findAllByText('O que é um algoritmo?')).at(-1)?.closest('li')
    expect(item).toBeTruthy()
    const slides = within(item as HTMLElement).getByRole('link', { name: 'Abrir a aula' })
    expect(slides).toHaveAttribute('href', '/aula/11')
    expect(slides).not.toHaveAttribute('target')
    const link = within(item as HTMLElement).getByRole('link', { name: /Apostila/ })
    expect(link).toHaveAttribute('href', 'https://exemplo.org/apostila')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('aula liberada mostra os exercícios do laboratório com o XP', async () => {
    carregarPonte.mockResolvedValue(dadosComUmaAulaLiberada())
    abrir('/ponte', ALUNO)
    const item = (await screen.findAllByText('O que é um algoritmo?')).at(-1)?.closest('li') as HTMLElement
    const exercicio = within(item).getByRole('link', { name: /Exercício: Soma de dois números/ })
    expect(exercicio).toHaveAttribute('href', '/exercicio/5')
    expect(exercicio).toHaveTextContent('+35 XP')
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
    expect(screen.getAllByText(/Unidade I · Aula 1 — O que é um algoritmo\?/).length).toBeGreaterThan(0)
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
