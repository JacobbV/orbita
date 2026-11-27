import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'
import type { AulaComExercicios, DadosDoExercicio } from '../../lib/exercicios'

// Dados inventados. Os falsos ficam fora do vi.fn (promessas rejeitadas).
const falso = vi.hoisted(() => ({
  dados: null as unknown,
  salvos: [] as { id: number | null; aulaId: number; dados: unknown }[],
  removidos: [] as number[],
  erroAoSalvar: null as Error | null,
  saidas: new Map<string, string>(),
  conferidas: [] as { id: number; confere: boolean }[],
}))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../../lib/exercicios', async (original) => ({
  ...(await original<typeof import('../../lib/exercicios')>()),
  carregarAulaComExercicios: async () => structuredClone(falso.dados),
  salvarExercicio: async (id: number | null, aulaId: number, dados: DadosDoExercicio) => {
    if (falso.erroAoSalvar) throw falso.erroAoSalvar
    falso.salvos.push({ id, aulaId, dados })
    return 99
  },
  removerExercicio: async (id: number) => {
    falso.removidos.push(id)
  },
  entregasParaReconferir: async () => [
    { id: 501, aluno: 'Lia Fictícia', tentativa: 1, codigo: 'certo', testesCertos: 2, testesTotal: 2 },
    { id: 502, aluno: 'Caio Inventado', tentativa: 2, codigo: 'sem-o-zero', testesCertos: 2, testesTotal: 2 },
  ],
  conferirEntrega: async (id: number, confere: boolean) => {
    falso.conferidas.push({ id, confere })
  },
}))

vi.mock('../../lab/EditorCodigo', () => ({
  EditorCodigo: ({ valor, aoMudar, rotulo }: { valor: string; aoMudar: (v: string) => void; rotulo: string }) => (
    <textarea aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} />
  ),
}))

vi.mock('../../lab/executor', async (original) => ({
  ...(await original<typeof import('../../lab/executor')>()),
  ExecutorPython: class {
    async carregar() {}
    async rodar(codigo: string, entrada: string) {
      const saida = falso.saidas.get(`${codigo}|${entrada}`) ?? falso.saidas.get(entrada) ?? ''
      return { saida: `${saida}\n`, erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false }
    }
    encerrar() {}
  },
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

function dados(): AulaComExercicios {
  return {
    aula: { id: 41, numero: 1, titulo: 'Repetição com while', unidade: 3, sigla: 'ALG', disciplina: 'Algoritmos' },
    exercicios: [
      {
        id: 7,
        titulo: 'Contagem regressiva',
        enunciado: 'Leia n e conte até zero.',
        dificuldade: 2,
        linguagem: 'python',
        codigoInicial: '',
        testes: [
          { tipo: 'visivel', entrada: '2', saidaEsperada: '2\n1\n0' },
          { tipo: 'oculto', entrada: '1', saidaEsperada: '1\n0' },
          { tipo: 'secreto', entrada: '0', saidaEsperada: '0' },
        ],
        entregas: 3,
        aConfirmar: 2,
      },
      { id: 8, titulo: 'Rascunho', enunciado: 'x', dificuldade: 1, linguagem: 'python', codigoInicial: '', testes: [{ tipo: 'visivel', entrada: '', saidaEsperada: '1' }], entregas: 0, aConfirmar: 0 },
    ],
  }
}

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.dados = dados()
  falso.salvos = []
  falso.removidos = []
  falso.erroAoSalvar = null
  falso.saidas = new Map()
  falso.conferidas = []
})

describe('Exercícios da aula (painel)', () => {
  it('lista os exercícios com dificuldade, testes e entregas', async () => {
    abrir('/professor/exercicios/41', PROFESSOR)
    expect(await screen.findByRole('heading', { level: 1, name: 'Repetição com while' })).toBeInTheDocument()
    expect(screen.getByText(/ALG · Unidade III · Aula 1/)).toBeInTheDocument()
    const item = screen.getByRole('heading', { name: 'Contagem regressiva' }).closest('li') as HTMLElement
    expect(item).toHaveTextContent('Python · Médio · +35 XP · 1 visível, 1 oculto, 1 secreto · 3 entregas')
    expect(within(item).getByRole('link', { name: 'Abrir Contagem regressiva como o aluno vê' })).toHaveAttribute('href', '/exercicio/7')
  })

  it('cria um exercício preenchendo as saídas com a solução', async () => {
    const u = userEvent.setup()
    falso.saidas.set('2 3', '5')
    falso.saidas.set('10 -4', '6')
    abrir('/professor/exercicios/41', PROFESSOR)
    await u.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    const form = screen.getByRole('form', { name: 'Novo exercício' })
    await u.type(within(form).getByLabelText('Título'), 'Soma')
    await u.type(within(form).getByLabelText('Enunciado'), 'Leia dois números e mostre a soma.')
    await u.click(within(form).getByLabelText(/Difícil/))
    await u.type(within(form).getByLabelText('Entrada do teste 1'), '2 3')
    await u.type(within(form).getByLabelText('Entrada do teste 2'), '10 -4')
    await u.click(within(form).getByText('Preencher as saídas com a sua solução'))
    await u.type(within(form).getByLabelText('Sua solução (não é salva)'), 'print(sum(map(int, input().split())))')
    await u.click(within(form).getByRole('button', { name: '▶ Rodar a solução nos testes' }))
    expect(await within(form).findByText('2 saídas preenchidas. Confira e salve o exercício.')).toBeInTheDocument()
    expect(within(form).getByLabelText('Saída esperada do teste 1')).toHaveValue('5')
    await u.click(within(form).getByRole('button', { name: 'Salvar exercício' }))
    expect(await screen.findByText('Exercício "Soma" criado.')).toBeInTheDocument()
    expect(falso.salvos).toEqual([
      {
        id: null,
        aulaId: 41,
        dados: {
          titulo: 'Soma',
          enunciado: 'Leia dois números e mostre a soma.',
          dificuldade: 3,
          linguagem: 'python',
          codigoInicial: '',
          testes: [
            { tipo: 'visivel', entrada: '2 3', saidaEsperada: '5' },
            { tipo: 'oculto', entrada: '10 -4', saidaEsperada: '6' },
          ],
        },
      },
    ])
  })

  it('cria exercício de HTML e CSS com consultas', async () => {
    const u = userEvent.setup()
    abrir('/professor/exercicios/41', PROFESSOR)
    await u.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    const form = screen.getByRole('form', { name: 'Novo exercício' })
    await u.type(within(form).getByLabelText('Título'), 'Meu cartão')
    await u.type(within(form).getByLabelText('Enunciado'), 'Faça um título.')
    await u.selectOptions(within(form).getByLabelText('Linguagem'), 'html')
    expect(within(form).getByText(/o valor final de uma propriedade CSS/)).toBeInTheDocument()
    await u.click(within(form).getByRole('button', { name: 'Remover teste 2' }))
    await u.type(within(form).getByLabelText('Entrada do teste 1'), 'h1')
    await u.type(within(form).getByLabelText('Saída esperada do teste 1'), 'Olá')
    await u.click(within(form).getByRole('button', { name: 'Salvar exercício' }))
    expect(await screen.findByText('Exercício "Meu cartão" criado.')).toBeInTheDocument()
    expect((falso.salvos[0]?.dados as DadosDoExercicio | undefined)?.linguagem).toBe('html')
  })

  it('confere os campos antes de salvar', async () => {
    const u = userEvent.setup()
    abrir('/professor/exercicios/41', PROFESSOR)
    await u.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    const form = screen.getByRole('form', { name: 'Novo exercício' })
    await u.selectOptions(within(form).getByLabelText('Tipo do teste 1'), 'secreto')
    await u.selectOptions(within(form).getByLabelText('Tipo do teste 2'), 'secreto')
    await u.click(within(form).getByRole('button', { name: 'Salvar exercício' }))
    expect(within(form).getByText('Escreva o título do exercício.')).toBeInTheDocument()
    expect(within(form).getByText('Escreva o enunciado do exercício.')).toBeInTheDocument()
    expect(within(form).getByText(/pelo menos um teste visível ou oculto/)).toBeInTheDocument()
    expect(within(form).getAllByText('Escreva a saída esperada (ou preencha com a sua solução).')).toHaveLength(2)
    expect(falso.salvos).toEqual([])
  })

  it('edita um exercício, troca um teste e mostra o erro do banco', async () => {
    const u = userEvent.setup()
    abrir('/professor/exercicios/41', PROFESSOR)
    await u.click(await screen.findByRole('button', { name: 'Editar Contagem regressiva' }))
    const form = screen.getByRole('form', { name: 'Editar: Contagem regressiva' })
    expect(within(form).getByLabelText('Título')).toHaveValue('Contagem regressiva')
    await u.click(within(form).getByRole('button', { name: 'Remover teste 3' }))
    await u.click(within(form).getByRole('button', { name: '+ Adicionar teste' }))
    await u.type(within(form).getByLabelText('Saída esperada do teste 3'), '9')
    falso.erroAoSalvar = new Error('Failed to fetch')
    await u.click(within(form).getByRole('button', { name: 'Salvar exercício' }))
    expect(await within(form).findByText(/Sem conexão com o servidor/)).toBeInTheDocument()
    falso.erroAoSalvar = null
    await u.click(within(form).getByRole('button', { name: 'Salvar exercício' }))
    expect(await screen.findByText('Exercício "Contagem regressiva" salvo.')).toBeInTheDocument()
    expect(falso.salvos[0]?.id).toBe(7)
    const salvo = falso.salvos[0]?.dados as DadosDoExercicio | undefined
    expect(salvo?.testes.map((t) => t.tipo)).toEqual(['visivel', 'oculto', 'oculto'])
  })

  it('só remove exercício sem entregas, depois de confirmar', async () => {
    const u = userEvent.setup()
    abrir('/professor/exercicios/41', PROFESSOR)
    await u.click(await screen.findByRole('button', { name: 'Remover Contagem regressiva' }))
    expect(screen.getByText(/já tem 3 entregas de alunos e não pode ser removido/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sim, remover' })).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Entendi' }))
    await u.click(screen.getByRole('button', { name: 'Remover Rascunho' }))
    await u.click(screen.getByRole('button', { name: 'Sim, remover' }))
    expect(await screen.findByText('Exercício "Rascunho" removido.')).toBeInTheDocument()
    expect(falso.removidos).toEqual([8])
  })

  it('reconfere as entregas com os testes secretos', async () => {
    const u = userEvent.setup()
    for (const codigo of ['certo', 'sem-o-zero']) {
      falso.saidas.set(`${codigo}|2`, '2\n1\n0')
      falso.saidas.set(`${codigo}|1`, '1\n0')
    }
    falso.saidas.set('certo|0', '0')
    falso.saidas.set('sem-o-zero|0', '')
    abrir('/professor/exercicios/41', PROFESSOR)
    const item = (await screen.findByRole('heading', { name: 'Contagem regressiva' })).closest('li') as HTMLElement
    expect(item).toHaveTextContent('3 entregas · 2 a confirmar')
    await u.click(within(item).getByRole('button', { name: 'Reconferir as entregas de Contagem regressiva' }))
    const painel = screen.getByRole('region', { name: 'Reconferência de Contagem regressiva' })
    expect(await within(painel).findByText('Pronto: 1 confirmada e 1 sem conferir.')).toBeInTheDocument()
    expect(painel).toHaveTextContent('Lia Fictícia (entrega 1): Confere: 2 de 2 testes e o secreto.')
    expect(painel).toHaveTextContent('Caio Inventado (entrega 2): Errou o teste secreto.')
    expect(falso.conferidas).toEqual([
      { id: 501, confere: true },
      { id: 502, confere: false },
    ])
  })

  it('aluno não entra', async () => {
    abrir('/professor/exercicios/41', { ...PROFESSOR, perfil: { ...PROFESSOR.perfil, papel: 'aluno' as const } })
    expect(screen.queryByText('Para praticar')).toBeNull()
  })
})
