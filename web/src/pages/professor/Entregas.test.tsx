import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import type { EntregaDoProfessor } from '../../lib/entregas'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'

// Dados inventados. As chamadas ao banco e o Python são trocados por versões falsas.
const falso = vi.hoisted(() => ({
  entregas: [] as Record<string, unknown>[],
  corrigidas: [] as { id: number; nota: number | null; comentario: string }[],
  devolvidas: [] as { id: number; comentario: string }[],
}))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

vi.mock('../../lib/professor', async (original) => ({
  ...(await original<typeof import('../../lib/professor')>()),
  listarOfertasDoPainel: async () => [
    {
      id: 11,
      turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 },
      disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos e Lógica de Programação' },
      turmaAtiva: true,
    },
  ],
}))

vi.mock('../../lib/exercicios', async (original) => ({
  ...(await original<typeof import('../../lib/exercicios')>()),
  carregarAulaComExercicios: async () => ({
    aula: { id: 5, numero: 2, titulo: 'Listas', unidade: 4, sigla: 'ALG', disciplina: 'Algoritmos' },
    exercicios: [
      {
        id: 7,
        titulo: 'Média da turma',
        enunciado: 'x',
        dificuldade: 1,
        linguagem: 'python',
        codigoInicial: '',
        entregas: 2,
        aConfirmar: 0,
        testes: [
          { tipo: 'visivel', entrada: '1', saidaEsperada: '1' },
          { tipo: 'secreto', entrada: '2', saidaEsperada: '4' },
        ],
      },
    ],
  }),
}))

vi.mock('../../lib/entregas', async (original) => ({
  ...(await original<typeof import('../../lib/entregas')>()),
  carregarEntregas: async () => ({
    alunos: [
      { alunoId: 'a1', nome: 'Andrômeda Vega', apelido: 'Cometa Veloz' },
      { alunoId: 'a2', nome: 'Sírius Altair', apelido: null },
      { alunoId: 'a3', nome: 'Lira Boreal', apelido: null },
    ],
    exercicios: [{ id: 7, aulaId: 5, titulo: 'Média da turma', linguagem: 'python', unidade: 4, aula: 2, aulaTitulo: 'Listas' }],
    entregas: falso.entregas as unknown as EntregaDoProfessor[],
  }),
  corrigirEntrega: async (id: number, nota: number | null, comentario: string) => {
    falso.corrigidas.push({ id, nota, comentario })
  },
  devolverEntrega: async (id: number, comentario: string) => {
    falso.devolvidas.push({ id, comentario })
  },
}))

vi.mock('../../lab/executor', async (original) => ({
  ...(await original<typeof import('../../lab/executor')>()),
  ExecutorPython: class {
    async carregar() {}
    async rodar(_codigo: string, entrada: string) {
      // O código do aluno só acerta o teste da entrada "1".
      return { saida: entrada === '1' ? '1' : '3', erro: null, tempoEsgotado: false, saidaGrande: false, precisaDeEntrada: false }
    }
    encerrar() {}
  },
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

const entrega = (extra: Record<string, unknown>) => ({
  id: 1,
  exercicioId: 7,
  alunoId: 'a1',
  tentativa: 1,
  codigo: 'print(1)',
  testesCertos: 1,
  testesTotal: 1,
  nota: 10,
  notaProfessor: null,
  comentario: null,
  situacao: 'a_confirmar',
  criadoEm: '2026-11-27T13:00:00Z',
  corrigidaEm: null,
  devolvidaEm: null,
  ...extra,
})

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.corrigidas = []
  falso.devolvidas = []
  falso.entregas = [
    entrega({ id: 1, alunoId: 'a1', codigo: 'print(1)' }),
    entrega({ id: 2, alunoId: 'a2', codigo: 'print(2)', corrigidaEm: '2026-11-27T14:00:00Z', notaProfessor: 6.5, nota: 5 }),
  ]
})

async function abrirTurma() {
  abrir('/professor?aba=entregas', PROFESSOR)
  await userEvent.click(await screen.findByRole('button', { name: /1º INFO M · 2026 · ALG/ }))
  return await screen.findByRole('region', { name: 'Exercício Média da turma' })
}

describe('Aba Entregas', () => {
  it('filtra por situação: falta corrigir, corrigidas e sem entrega', async () => {
    const u = userEvent.setup()
    const exercicio = await abrirTurma()
    const filtros = screen.getByRole('group', { name: 'Mostrar por situação' })
    expect(within(filtros).getByRole('button', { name: 'Todas (3)' })).toBeInTheDocument()
    expect(within(filtros).getByRole('button', { name: 'Falta corrigir (1)' })).toBeInTheDocument()

    await u.click(within(filtros).getByRole('button', { name: 'Falta corrigir (1)' }))
    expect(within(exercicio).getByText('Andrômeda Vega')).toBeInTheDocument()
    expect(within(exercicio).queryByText('Sírius Altair')).toBeNull()
    expect(within(exercicio).queryByText('Lira Boreal')).toBeNull()

    await u.click(within(filtros).getByRole('button', { name: 'Corrigidas (1)' }))
    expect(within(exercicio).getByText('Sírius Altair')).toBeInTheDocument()
    expect(within(exercicio).queryByText('Andrômeda Vega')).toBeNull()

    await u.click(within(filtros).getByRole('button', { name: 'Devolvidas (0)' }))
    expect(screen.getByText('Nenhuma entrega nesta situação.')).toBeInTheDocument()

    await u.click(within(filtros).getByRole('button', { name: 'Sem entrega (1)' }))
    expect(within(screen.getByRole('region', { name: 'Exercício Média da turma' })).getByText('Lira Boreal')).toBeInTheDocument()
  })

  it('organiza por aula e exercício, com o status de cada aluno', async () => {
    const exercicio = await abrirTurma()
    expect(screen.getByText('Listas')).toBeInTheDocument()
    expect(exercicio).toHaveTextContent('2 de 3 entregaram · 1 falta corrigir')
    const linha = (nome: string) => within(exercicio).getByText(nome).closest('li') as HTMLElement
    expect(linha('Andrômeda Vega')).toHaveTextContent('entregue, falta corrigir')
    expect(linha('Andrômeda Vega')).toHaveTextContent('(Cometa Veloz)')
    expect(linha('Sírius Altair')).toHaveTextContent('corrigida')
    expect(linha('Sírius Altair')).toHaveTextContent('6,5')
    expect(linha('Lira Boreal')).toHaveTextContent('sem entrega')
    expect(within(linha('Lira Boreal')).queryByRole('button')).toBeNull()
  })

  it('abre o código e roda todos os testes, inclusive o secreto', async () => {
    const u = userEvent.setup()
    await abrirTurma()
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    const detalhe = screen.getByRole('region', { name: 'Entrega de Andrômeda Vega' })
    expect(within(detalhe).getByLabelText('Código de Andrômeda Vega')).toHaveTextContent('print(1)')
    await u.click(within(detalhe).getByRole('button', { name: '▶ Rodar os testes' }))
    expect(await within(detalhe).findByText('1 de 2 testes certos (inclui os secretos)')).toBeInTheDocument()
    expect(detalhe).toHaveTextContent('Teste 2 (secreto)')
    expect(detalhe).toHaveTextContent('Esperado: 4')
  })

  it('a entrega abre logo abaixo da linha do aluno e cada questão recolhe', async () => {
    const u = userEvent.setup()
    await abrirTurma()
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    const item = screen.getByRole('region', { name: 'Entrega de Andrômeda Vega' }).closest('li')
    expect(item).toHaveTextContent('Andrômeda Vega')
    const questao = item?.closest('details')
    expect(questao).toHaveAttribute('open')
    await u.click(questao!.querySelector('summary')!)
    expect(questao).not.toHaveAttribute('open')
  })

  it('salva a nota ajustada e o comentário', async () => {
    const u = userEvent.setup()
    await abrirTurma()
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    const detalhe = screen.getByRole('region', { name: 'Entrega de Andrômeda Vega' })
    await u.type(within(detalhe).getByLabelText('Nota (0 a 10)'), '8,5')
    await u.type(within(detalhe).getByLabelText('Comentário para o aluno'), 'Bom trabalho.')
    await u.click(within(detalhe).getByRole('button', { name: 'Salvar correção' }))
    expect(await within(detalhe).findByText(/Correção salva/)).toBeInTheDocument()
    expect(falso.corrigidas).toEqual([{ id: 1, nota: 8.5, comentario: 'Bom trabalho.' }])
  })

  it('nota fora de 0 a 10 não é enviada', async () => {
    const u = userEvent.setup()
    await abrirTurma()
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    const detalhe = screen.getByRole('region', { name: 'Entrega de Andrômeda Vega' })
    await u.type(within(detalhe).getByLabelText('Nota (0 a 10)'), '11')
    await u.click(within(detalhe).getByRole('button', { name: 'Salvar correção' }))
    expect(await within(detalhe).findByText(/A nota vai de 0 a 10/)).toBeInTheDocument()
    expect(falso.corrigidas).toEqual([])
  })

  it('devolver pede confirmação e manda o comentário junto', async () => {
    const u = userEvent.setup()
    await abrirTurma()
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    const detalhe = screen.getByRole('region', { name: 'Entrega de Andrômeda Vega' })
    await u.type(within(detalhe).getByLabelText('Comentário para o aluno'), 'Leia a entrada com input().')
    await u.click(within(detalhe).getByRole('button', { name: 'Devolver para refazer' }))
    expect(within(detalhe).getByRole('alertdialog')).toHaveTextContent('Ele poderá mudar o código e entregar de novo')
    expect(falso.devolvidas).toEqual([])
    await u.click(within(detalhe).getByRole('button', { name: 'Sim, devolver' }))
    expect(await within(detalhe).findByText(/Devolvida para Andrômeda Vega/)).toBeInTheDocument()
    expect(falso.devolvidas).toEqual([{ id: 1, comentario: 'Leia a entrada com input().' }])
  })

  it('entrega já devolvida não mostra o botão de devolver', async () => {
    falso.entregas = [entrega({ id: 1, alunoId: 'a1', devolvidaEm: '2026-11-27T15:00:00Z', corrigidaEm: '2026-11-27T15:00:00Z' })]
    const u = userEvent.setup()
    const exercicio = await abrirTurma()
    expect(within(exercicio).getByText('Andrômeda Vega').closest('li')).toHaveTextContent('devolvida para refazer')
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    expect(screen.queryByRole('button', { name: 'Devolver para refazer' })).toBeNull()
  })

  it('com mais de uma entrega, dá para alternar entre elas', async () => {
    falso.entregas = [
      entrega({ id: 3, alunoId: 'a1', tentativa: 2, codigo: 'print("novo")' }),
      entrega({ id: 1, alunoId: 'a1', tentativa: 1, codigo: 'print("velho")', devolvidaEm: '2026-11-27T15:00:00Z', corrigidaEm: 'x' }),
    ]
    const u = userEvent.setup()
    await abrirTurma()
    await u.click(screen.getByRole('button', { name: 'Abrir a entrega de Andrômeda Vega' }))
    expect(screen.getByLabelText('Código de Andrômeda Vega')).toHaveTextContent('print("novo")')
    await u.click(screen.getByRole('button', { name: 'Entrega 1 (devolvida)' }))
    expect(screen.getByLabelText('Código de Andrômeda Vega')).toHaveTextContent('print("velho")')
  })
})
