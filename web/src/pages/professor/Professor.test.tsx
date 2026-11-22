import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import type { OfertaDoPainel, PedidoDoPainel, UnidadeDoPainel } from '../../lib/professor'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'

// Banco falso: o painel recebe dados prontos e as ações são só registradas.
const acoes = vi.hoisted(() => ({
  decidirPedido: vi.fn(async () => {}),
  aprovarTodos: vi.fn(async () => 2),
  liberarAula: vi.fn(async () => {}),
  liberarUnidade: vi.fn(async () => {}),
  salvarAula: vi.fn(async () => {}),
  adicionarAula: vi.fn(async () => {}),
  removerAula: vi.fn(async () => {}),
  adicionarUnidade: vi.fn(async () => {}),
  salvarTurma: vi.fn(async () => {}),
  enviarSlides: vi.fn(async (_aula: number, _arquivo: File) => {}),
  removerSlides: vi.fn(async () => {}),
}))

const ALG_M: OfertaDoPainel = {
  id: 11,
  turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
  disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
  turmaAtiva: true,
}

function pedido(id: number, nome: string, extra: Partial<PedidoDoPainel> = {}): PedidoDoPainel {
  return {
    id,
    status: 'pendente',
    tentativa: 1,
    quemEVoce: `${nome}, 1º INFO M, manhã`,
    motivoRecusa: null,
    criadoEm: '2026-11-20T13:00:00Z',
    decididoEm: null,
    aluno: { nome, email: `${nome.split(' ')[0]?.toLowerCase()}@academico.ifpb.edu.br` },
    oferta: ALG_M,
    ...extra,
  }
}

let pedidos: PedidoDoPainel[] = []
let estrutura: UnidadeDoPainel[] = []

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../../lib/professor', async (original) => ({
  ...(await original<typeof import('../../lib/professor')>()),
  listarPedidos: async () => pedidos,
  listarOfertasDoPainel: async () => [ALG_M],
  listarTurmas: async () => [{ id: 1, nome: '1º INFO M', serie: 1, turno: 'manha', anoLetivo: 2026, ativa: true }],
  carregarEstrutura: async () => estrutura,
  ...acoes,
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  for (const f of Object.values(acoes)) f.mockClear()
  pedidos = [
    pedido(1, 'Estrela Cadente'),
    pedido(2, 'Cometa Halley', { tentativa: 2 }),
    pedido(3, 'Lua Nova', { status: 'recusado', motivoRecusa: 'Turma errada.', decididoEm: '2026-11-21T10:00:00Z' }),
  ]
  estrutura = [
    {
      id: 1,
      numero: 1,
      titulo: 'Primeiros passos',
      aulas: [
        { id: 11, numero: 1, titulo: 'O que é um algoritmo?', liberada: true, link: { titulo: 'Material', url: 'https://exemplo.org/a' }, slides: { id: 90, caminho: 'aulas/11/slides-1.html' } },
        { id: 12, numero: 2, titulo: 'Do algoritmo ao programa', liberada: false, link: null, slides: null },
      ],
    },
  ]
})

describe('Painel do professor: pedidos', () => {
  it('mostra os pendentes com o "Quem é você" e a tentativa', async () => {
    abrir('/professor', PROFESSOR)
    expect(await screen.findByText('Estrela Cadente')).toBeInTheDocument()
    expect(screen.getByText('Estrela Cadente, 1º INFO M, manhã')).toBeInTheDocument()
    expect(screen.getByText('Tentativa 2 de 3')).toBeInTheDocument()
    expect(screen.queryByText('Lua Nova')).toBeNull()
    expect(screen.getByRole('button', { name: 'Aguardando (2)' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('aprova um pedido', async () => {
    const usuario = userEvent.setup()
    abrir('/professor', PROFESSOR)
    const cartao = (await screen.findByText('Estrela Cadente')).closest('li') as HTMLElement
    await usuario.click(within(cartao).getByRole('button', { name: 'Aprovar' }))
    expect(acoes.decidirPedido).toHaveBeenCalledWith(1, true, undefined)
    expect(await screen.findByText('Pedido de Estrela Cadente aprovado.')).toBeInTheDocument()
  })

  it('recusa com motivo opcional', async () => {
    const usuario = userEvent.setup()
    abrir('/professor', PROFESSOR)
    const cartao = (await screen.findByText('Cometa Halley')).closest('li') as HTMLElement
    await usuario.click(within(cartao).getByRole('button', { name: 'Recusar' }))
    await usuario.type(within(cartao).getByLabelText('Motivo da recusa (opcional)'), 'Não está na chamada.')
    await usuario.click(within(cartao).getByRole('button', { name: 'Confirmar recusa' }))
    expect(acoes.decidirPedido).toHaveBeenCalledWith(2, false, 'Não está na chamada.')
  })

  it('aprovar todos pede confirmação antes', async () => {
    const usuario = userEvent.setup()
    abrir('/professor', PROFESSOR)
    await usuario.click(await screen.findByRole('button', { name: 'Aprovar todos (2)' }))
    expect(acoes.aprovarTodos).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Sim, aprovar 2' }))
    expect(acoes.aprovarTodos).toHaveBeenCalledWith(11)
    expect(await screen.findByText(/2 pedidos aprovados/)).toBeInTheDocument()
  })

  it('mostra os recusados com o motivo', async () => {
    const usuario = userEvent.setup()
    abrir('/professor', PROFESSOR)
    await usuario.click(await screen.findByRole('button', { name: 'Recusados (1)' }))
    expect(screen.getByText('Lua Nova')).toBeInTheDocument()
    expect(screen.getByText('Turma errada.')).toBeInTheDocument()
  })
})

describe('Painel do professor: aulas', () => {
  it('libera e bloqueia aulas da turma escolhida', async () => {
    const usuario = userEvent.setup()
    abrir('/professor?aba=aulas', PROFESSOR)
    await usuario.click(await screen.findByRole('button', { name: 'Liberar aula I.2' }))
    expect(acoes.liberarAula).toHaveBeenCalledWith(11, 12, true)
    await usuario.click(await screen.findByRole('button', { name: 'Bloquear aula I.1' }))
    expect(acoes.liberarAula).toHaveBeenCalledWith(11, 11, false)
    await usuario.click(screen.getByRole('button', { name: 'Liberar unidade I' }))
    expect(acoes.liberarUnidade).toHaveBeenCalledWith(11, 1, true)
  })

  it('envia, troca e remove os slides de uma aula', async () => {
    const usuario = userEvent.setup()
    abrir('/professor?aba=aulas', PROFESSOR)
    await usuario.click(await screen.findByRole('button', { name: 'Editar aula I.2' }))
    await usuario.click(screen.getByRole('button', { name: 'Enviar slides' }))
    expect(screen.getByText('Escolha o arquivo .html dos slides.')).toBeInTheDocument()
    const entrada = screen.getByLabelText('Arquivo de slides da aula I.2')
    const arquivo = new File(['<h1>Aula</h1>'], 'ALG_U1_A2.html', { type: 'text/html' })
    await usuario.upload(entrada, arquivo)
    await usuario.click(screen.getByRole('button', { name: 'Enviar slides' }))
    expect(acoes.enviarSlides).toHaveBeenCalledWith(12, arquivo)
    expect(await screen.findByText('Slides da aula I.2 enviados.')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Editar aula I.1' }))
    expect(screen.getByRole('link', { name: 'Abrir os slides' })).toHaveAttribute('href', '/slides/90')
    await usuario.click(screen.getByRole('button', { name: 'Remover slides' }))
    expect(acoes.removerSlides).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Sim, remover slides' }))
    expect(acoes.removerSlides).toHaveBeenCalledWith(11)
  })

  it('envia vários slides de uma vez, cada um na aula do nome', async () => {
    const usuario = userEvent.setup()
    abrir('/professor?aba=aulas', PROFESSOR)
    await usuario.click(await screen.findByText('Enviar vários slides de uma vez'))
    const arquivos = [
      new File(['a'], 'ALG_U1_A1.html', { type: 'text/html' }),
      new File(['b'], 'ALG_U1_A2.html', { type: 'text/html' }),
      new File(['c'], 'ALG_U3_A1.html', { type: 'text/html' }),
    ]
    await usuario.upload(screen.getByLabelText('Arquivos de slides'), arquivos)
    expect(screen.getByText('→ Aula I.1: O que é um algoritmo? (substitui)')).toBeInTheDocument()
    expect(screen.getByText('→ Aula I.2: Do algoritmo ao programa')).toBeInTheDocument()
    expect(screen.getByText('Esta disciplina não tem essa aula.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Enviar 2 arquivos' }))
    expect(acoes.enviarSlides.mock.calls.map(([aula, arquivo]) => [aula, arquivo.name])).toEqual([
      [11, 'ALG_U1_A1.html'],
      [12, 'ALG_U1_A2.html'],
    ])
    expect(await screen.findByText('2 arquivos de slides enviados.')).toBeInTheDocument()
  })

  it('edita título e link e recusa link sem https', async () => {
    const usuario = userEvent.setup()
    abrir('/professor?aba=aulas', PROFESSOR)
    await usuario.click(await screen.findByRole('button', { name: 'Editar aula I.2' }))
    const link = screen.getByLabelText('Link da aula (Drive, slides)')
    await usuario.type(link, 'http://exemplo.org/inseguro')
    await usuario.click(screen.getByRole('button', { name: 'Salvar aula' }))
    expect(screen.getByText('O link precisa começar com https://.')).toBeInTheDocument()
    expect(acoes.salvarAula).not.toHaveBeenCalled()
    await usuario.clear(link)
    await usuario.type(link, 'https://exemplo.org/slides')
    await usuario.click(screen.getByRole('button', { name: 'Salvar aula' }))
    expect(acoes.salvarAula).toHaveBeenCalledWith(12, 'Do algoritmo ao programa', 'https://exemplo.org/slides')
  })

  it('adiciona aula e só remove depois de confirmar', async () => {
    const usuario = userEvent.setup()
    abrir('/professor?aba=aulas', PROFESSOR)
    await usuario.type(await screen.findByLabelText('Nova aula na unidade I'), 'Variáveis')
    await usuario.click(screen.getByRole('button', { name: 'Adicionar aula' }))
    expect(acoes.adicionarAula).toHaveBeenCalledWith(1, 'Variáveis')

    await usuario.click(screen.getByRole('button', { name: 'Editar aula I.1' }))
    await usuario.click(screen.getByRole('button', { name: 'Remover aula' }))
    expect(acoes.removerAula).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Sim, remover' }))
    expect(acoes.removerAula).toHaveBeenCalledWith(11)
  })
})

describe('Painel do professor: turmas', () => {
  it('muda o ano letivo', async () => {
    const usuario = userEvent.setup()
    abrir('/professor?aba=turmas', PROFESSOR)
    const ano = await screen.findByLabelText('Ano letivo')
    await usuario.clear(ano)
    await usuario.type(ano, '2027')
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(acoes.salvarTurma).toHaveBeenCalledWith(1, { anoLetivo: 2027, ativa: true }))
  })
})

describe('Painel do professor: acesso', () => {
  it('aluno não abre o painel', async () => {
    abrir('/professor', { ...PROFESSOR, perfil: { ...PROFESSOR.perfil, papel: 'aluno' } })
    expect(await screen.findByRole('heading', { level: 1 })).not.toHaveTextContent('Olá, Professor.')
    expect(screen.queryByText('Painel do professor')).toBeNull()
  })
})
