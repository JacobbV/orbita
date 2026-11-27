import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import type { DisciplinaDaVisao } from '../../lib/exercicios'
import type { ProvaDoPainel } from '../../lib/provas'
import { abrir, prepararNavegadorFalso, SEM_LOGIN } from '../../test/renderizar'

// Dados inventados. As consultas ao banco são trocadas por versões falsas.
const falso = vi.hoisted(() => ({ provas: [] as unknown[], falhaProvas: false }))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurado: () => true,
  urlDoSite: (c: string) => `http://localhost/orbita/${c}`,
  supabase: () => ({}),
}))

const visao: DisciplinaDaVisao[] = [
  {
    id: 1,
    sigla: 'ALG',
    nome: 'Algoritmos e Lógica de Programação',
    unidades: [
      {
        id: 1,
        numero: 1,
        titulo: 'Primeiros passos',
        aulas: [
          {
            id: 11,
            numero: 1,
            titulo: 'O que é um algoritmo?',
            exercicios: [
              { id: 1, titulo: 'Olá, nave', dificuldade: 1, linguagem: 'python', entregas: 3, aConfirmar: 2 },
              { id: 2, titulo: 'Soma dupla', dificuldade: 2, linguagem: 'python', entregas: 0, aConfirmar: 0 },
            ],
          },
          { id: 12, numero: 2, titulo: 'Variáveis e tipos', exercicios: [] },
        ],
      },
    ],
  },
  { id: 2, sigla: 'WEB', nome: 'Desenvolvimento Web', unidades: [] },
]

vi.mock('../../lib/exercicios', async (original) => ({
  ...(await original<typeof import('../../lib/exercicios')>()),
  listarVisaoDosExercicios: async () => visao,
}))

vi.mock('../../lib/provas', async (original) => ({
  ...(await original<typeof import('../../lib/provas')>()),
  listarProvas: async () => {
    if (falso.falhaProvas) throw new Error('sem provas')
    return falso.provas
  },
}))

const PROFESSOR = {
  ...SEM_LOGIN,
  sessao: { user: { id: 'p1' } } as unknown as Session,
  perfil: { id: 'p1', nome: 'Professor Fictício', email: 'prof@academico.ifpb.edu.br', papel: 'professor' as const },
}

const prova = (extra: Partial<ProvaDoPainel>): ProvaDoPainel =>
  ({
    id: 9,
    oferta: { id: 11, turma: { id: 1, nome: '1º INFO M', turno: 'manha', anoLetivo: 2026 }, disciplina: { id: 1, sigla: 'ALG', nome: 'Algoritmos' }, turmaAtiva: true },
    titulo: 'Prova da Unidade I',
    instrucoes: '',
    abreEm: new Date(Date.now() - 3_600_000).toISOString(),
    fechaEm: new Date(Date.now() + 3_600_000).toISOString(),
    duracaoMin: 60,
    saidasParaEncerrar: null,
    notasPublicadasEm: null,
    questoes: 2,
    tentativas: 5,
    ...extra,
  }) as ProvaDoPainel

beforeAll(prepararNavegadorFalso)
beforeEach(() => {
  falso.provas = []
  falso.falhaProvas = false
})

describe('Aba Exercícios do painel', () => {
  it('lista os exercícios por unidade e aula, com atalho para criar e editar', async () => {
    abrir('/professor?aba=exercicios', PROFESSOR)
    expect(await screen.findByRole('heading', { name: 'Exercícios' })).toBeInTheDocument()
    expect(screen.getByText(/2 exercícios · 2 entregas esperam reconferência/)).toBeInTheDocument()
    const aula1 = screen.getByText('O que é um algoritmo?').closest('li') as HTMLElement
    expect(within(aula1).getByText('Olá, nave')).toBeInTheDocument()
    expect(within(aula1).getByText(/3 entregas · 2 para reconferir/)).toBeInTheDocument()
    expect(within(aula1).getByRole('link', { name: /Editar exercícios da aula O que é um algoritmo/ })).toHaveAttribute('href', '/professor/exercicios/11')
    const aula2 = screen.getByText('Variáveis e tipos').closest('li') as HTMLElement
    expect(within(aula2).getByText('Nenhum exercício.')).toBeInTheDocument()
    expect(within(aula2).getByRole('link', { name: /Criar exercícios da aula Variáveis e tipos/ })).toHaveAttribute('href', '/professor/exercicios/12')
  })

  it('troca de disciplina', async () => {
    abrir('/professor?aba=exercicios', PROFESSOR)
    await screen.findByRole('heading', { name: 'Exercícios' })
    await userEvent.click(screen.getByRole('button', { name: 'WEB' }))
    expect(screen.getByText(/Desenvolvimento Web: 0 exercícios/)).toBeInTheDocument()
    expect(screen.queryByText('Olá, nave')).toBeNull()
  })
})

describe('Alerta de prova no painel', () => {
  it('avisa da prova aberta agora, com atalho para acompanhar', async () => {
    falso.provas = [prova({})]
    abrir('/professor', PROFESSOR)
    const alerta = await screen.findByRole('complementary', { name: 'Alerta de prova' })
    expect(alerta).toHaveTextContent('Prova aberta agora')
    expect(alerta).toHaveTextContent('Prova da Unidade I')
    expect(alerta).toHaveTextContent('5 alunos começaram')
    expect(within(alerta).getByRole('link', { name: 'Acompanhar' })).toHaveAttribute('href', '/professor/prova/9/acompanhar')
  })

  it('avisa quando há notas por publicar', async () => {
    falso.provas = [
      prova({
        abreEm: new Date(Date.now() - 7_200_000).toISOString(),
        fechaEm: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    ]
    abrir('/professor', PROFESSOR)
    const alerta = await screen.findByRole('complementary', { name: 'Alerta de prova' })
    expect(alerta).toHaveTextContent('Notas por publicar')
    expect(within(alerta).getByRole('link', { name: 'Conferir e publicar' })).toBeInTheDocument()
  })

  it('some se não há prova ou se a consulta falha', async () => {
    abrir('/professor', PROFESSOR)
    await screen.findByText('Painel do professor')
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('complementary', { name: 'Alerta de prova' })).toBeNull()
  })
})
